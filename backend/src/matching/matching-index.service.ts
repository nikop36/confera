import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmbeddingService } from './embedding.service';
import {
  buildProfileSearchText,
  hashProfileSearchText,
  SearchableProfile,
} from './profile-search-document';

export type ProfileMatch = {
  uid: string;
  displayName: string;
  affiliation?: string;
  bio?: string;
  interests: string[];
  goals: string[];
  competencies: string[];
  researchKeywords: string[];
  meetingType?: string;
  score: number;
  reasons: string[];
};

type MatchRow = {
  uid: string;
  display_name: string;
  affiliation: string | null;
  bio: string | null;
  interests: string[];
  goals: string[];
  competencies: string[];
  research_keywords: string[];
  meeting_type: string | null;
  score: number;
};

@Injectable()
export class MatchingIndexService {
  private readonly logger = new Logger(MatchingIndexService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  get enabled() {
    return this.databaseService.enabled;
  }

  async upsertProfile(profile: SearchableProfile) {
    if (!this.databaseService.enabled) return;

    const profileText = buildProfileSearchText(profile);
    const profileHash = hashProfileSearchText(profileText);
    const embedding = this.embeddingService.toSqlVector(
      this.embeddingService.createEmbedding(profileText),
    );

    await this.databaseService.query(
      `
      insert into participant_profile_index (
        uid,
        display_name,
        email,
        affiliation,
        bio,
        interests,
        goals,
        competencies,
        research_keywords,
        meeting_type,
        profile_text,
        profile_embedding,
        embedding_model,
        profile_hash,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12::vector, $13, $14, now()
      )
      on conflict (uid) do update set
        display_name = excluded.display_name,
        email = excluded.email,
        affiliation = excluded.affiliation,
        bio = excluded.bio,
        interests = excluded.interests,
        goals = excluded.goals,
        competencies = excluded.competencies,
        research_keywords = excluded.research_keywords,
        meeting_type = excluded.meeting_type,
        profile_text = excluded.profile_text,
        profile_embedding = case
          when participant_profile_index.profile_hash = excluded.profile_hash
          then participant_profile_index.profile_embedding
          else excluded.profile_embedding
        end,
        embedding_model = excluded.embedding_model,
        profile_hash = excluded.profile_hash,
        updated_at = now()
      `,
      [
        profile.uid,
        profile.displayName,
        profile.email,
        profile.affiliation ?? null,
        profile.bio ?? null,
        profile.interests ?? [],
        profile.goals ?? [],
        profile.competencies ?? [],
        profile.researchKeywords ?? [],
        profile.meetingType ?? 'both',
        profileText,
        embedding,
        this.embeddingService.model,
        profileHash,
      ],
    );
  }

  async safeUpsertProfile(profile: SearchableProfile) {
    try {
      await this.upsertProfile(profile);
    } catch (error) {
      this.logger.warn(
        `Profile was saved, but matching index sync failed for ${profile.uid}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async findMatches(
    profile: SearchableProfile,
    limit = 10,
  ): Promise<ProfileMatch[]> {
    if (!this.databaseService.enabled) {
      throw new Error('Matching database is not configured.');
    }

    await this.upsertProfile(profile);

    const profileText = buildProfileSearchText(profile);
    const embedding = this.embeddingService.toSqlVector(
      this.embeddingService.createEmbedding(profileText),
    );

    const result = await this.databaseService.query<MatchRow>(
      `
      select *
      from hybrid_profile_search($1, $2::vector, $3, $4)
      `,
      [profileText, embedding, profile.uid, limit],
    );

    return result.rows.map((row) => ({
      uid: row.uid,
      displayName: row.display_name,
      affiliation: row.affiliation ?? undefined,
      bio: row.bio ?? undefined,
      interests: row.interests ?? [],
      goals: row.goals ?? [],
      competencies: row.competencies ?? [],
      researchKeywords: row.research_keywords ?? [],
      meetingType: row.meeting_type ?? undefined,
      score: Number(row.score),
      reasons: this.buildReasons(profile, row),
    }));
  }

  private buildReasons(profile: SearchableProfile, match: MatchRow) {
    const reasons: string[] = [];
    const sharedInterests = intersection(profile.interests, match.interests);
    const sharedGoals = intersection(profile.goals, match.goals);
    const sharedKeywords = intersection(
      profile.researchKeywords,
      match.research_keywords,
    );

    if (sharedInterests.length) {
      reasons.push(`Skupna področja interesa: ${sharedInterests.join(', ')}`);
    }

    if (sharedGoals.length) {
      reasons.push(`Podobni cilji mreženja: ${sharedGoals.join(', ')}`);
    }

    if (sharedKeywords.length) {
      reasons.push(`Ujemanje ključnih besed: ${sharedKeywords.join(', ')}`);
    }

    if (
      profile.meetingType &&
      match.meeting_type &&
      isMeetingTypeCompatible(profile.meetingType, match.meeting_type)
    ) {
      reasons.push('Združljiva preferenca za način srečanja');
    }

    return reasons.length ? reasons : ['Semantično podoben profil'];
  }
}

function intersection(left?: string[], right?: string[]) {
  const rightSet = new Set(right ?? []);
  return (left ?? []).filter((value) => rightSet.has(value));
}

function isMeetingTypeCompatible(left: string, right: string) {
  return left === 'both' || right === 'both' || left === right;
}
