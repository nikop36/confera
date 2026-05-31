import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

const MATCHING_SCHEMA_SQL = `
create extension if not exists vector;
create extension if not exists unaccent;

create table if not exists participant_profile_index (
  uid text primary key,
  display_name text not null,
  email text,
  affiliation text,
  bio text,
  interests text[] not null default '{}',
  goals text[] not null default '{}',
  competencies text[] not null default '{}',
  research_keywords text[] not null default '{}',
  meeting_type text,
  profile_text text not null,
  profile_embedding vector(384),
  embedding_model text,
  profile_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists participant_profile_text_idx
  on participant_profile_index
  using gin (to_tsvector('simple', profile_text));

create index if not exists participant_profile_embedding_idx
  on participant_profile_index
  using ivfflat (profile_embedding vector_cosine_ops)
  with (lists = 100);

create or replace function hybrid_profile_search(
  query_text text,
  query_embedding vector(384),
  current_uid text,
  result_limit integer default 10
)
returns table (
  uid text,
  display_name text,
  affiliation text,
  bio text,
  interests text[],
  goals text[],
  competencies text[],
  research_keywords text[],
  meeting_type text,
  score double precision,
  keyword_rank bigint,
  semantic_rank bigint
)
language sql
as $$
with keyword as (
  select
    p.uid,
    p.display_name,
    p.affiliation,
    p.bio,
    p.interests,
    p.goals,
    p.competencies,
    p.research_keywords,
    p.meeting_type,
    row_number() over (
      order by ts_rank(
        to_tsvector('simple', p.profile_text),
        plainto_tsquery('simple', query_text)
      ) desc
    ) as rank
  from participant_profile_index p
  where p.uid <> current_uid
    and to_tsvector('simple', p.profile_text)
      @@ plainto_tsquery('simple', query_text)
  limit 50
),
semantic as (
  select
    p.uid,
    p.display_name,
    p.affiliation,
    p.bio,
    p.interests,
    p.goals,
    p.competencies,
    p.research_keywords,
    p.meeting_type,
    row_number() over (
      order by p.profile_embedding <=> query_embedding
    ) as rank
  from participant_profile_index p
  where p.uid <> current_uid
    and p.profile_embedding is not null
  limit 50
),
combined as (
  select
    coalesce(k.uid, s.uid) as uid,
    coalesce(k.display_name, s.display_name) as display_name,
    coalesce(k.affiliation, s.affiliation) as affiliation,
    coalesce(k.bio, s.bio) as bio,
    coalesce(k.interests, s.interests) as interests,
    coalesce(k.goals, s.goals) as goals,
    coalesce(k.competencies, s.competencies) as competencies,
    coalesce(k.research_keywords, s.research_keywords) as research_keywords,
    coalesce(k.meeting_type, s.meeting_type) as meeting_type,
    coalesce(1.0 / (60 + k.rank), 0) +
      coalesce(1.0 / (60 + s.rank), 0) as score,
    k.rank as keyword_rank,
    s.rank as semantic_rank
  from keyword k
  full outer join semantic s on k.uid = s.uid
)
select *
from combined
order by score desc
limit result_limit;
$$;

create table if not exists event_profile_index (
  event_id text primary key,
  title text not null,
  description text not null,
  location text not null,
  tags text[] not null default '{}',
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer not null default 0,
  registered_count integer not null default 0,
  event_text text not null,
  event_embedding vector(384),
  embedding_model text,
  event_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists event_profile_start_at_idx
  on event_profile_index (start_at);

create index if not exists event_profile_embedding_idx
  on event_profile_index
  using ivfflat (event_embedding vector_cosine_ops)
  with (lists = 100);

create or replace function semantic_event_search(
  query_embedding vector(384),
  now_at timestamptz,
  result_limit integer default 30
)
returns table (
  event_id text,
  score double precision
)
language sql
as $$
  select
    e.event_id,
    greatest(0, 1 - (e.event_embedding <=> query_embedding)) as score
  from event_profile_index e
  where e.end_at >= now_at
    and e.event_embedding is not null
  order by e.event_embedding <=> query_embedding
  limit result_limit;
$$;
`;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool?: Pool;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      this.logger.warn(
        'DATABASE_URL is not set. SQL matching index is disabled.',
      );
      return;
    }

    this.pool = new Pool({
      connectionString,
      ssl:
        this.configService.get<string>('DATABASE_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  get enabled() {
    return Boolean(this.pool);
  }

  async onModuleInit() {
    if (!this.pool) return;

    await this.pool.query(MATCHING_SCHEMA_SQL);
    this.logger.log('PostgreSQL matching schema is ready.');
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error(
        'PostgreSQL is not configured. Set DATABASE_URL to enable matching.',
      );
    }

    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
