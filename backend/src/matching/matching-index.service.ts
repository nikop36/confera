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
  tags: string[];
  score: number;
  reasons: string[];
};

type MatchRow = {
  uid: string;
  display_name: string;
  affiliation: string | null;
  bio: string | null;
  tags: string[];
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
    if (!hasTags(profile)) {
      await this.removeProfile(profile.uid);
      return;
    }

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
        tags,
        profile_text,
        profile_embedding,
        embedding_model,
        profile_hash,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8::vector, $9, $10, now()
      )
      on conflict (uid) do update set
        display_name = excluded.display_name,
        email = excluded.email,
        affiliation = excluded.affiliation,
        bio = excluded.bio,
        tags = excluded.tags,
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
        profile.tags ?? [],
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

  async removeProfile(uid: string) {
    if (!this.databaseService.enabled) return;
    await this.databaseService.query(
      `delete from participant_profile_index where uid = $1`,
      [uid],
    );
  }

  async safeRemoveProfile(uid: string) {
    try {
      await this.removeProfile(uid);
    } catch (error) {
      this.logger.warn(
        `Profile index cleanup failed for ${uid}: ${
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

    if (!hasTags(profile)) {
      await this.removeProfile(profile.uid);
      return [];
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
      tags: row.tags ?? [],
      score: Number(row.score),
      reasons: this.buildReasons(profile, row),
    }));
  }

  private buildReasons(profile: SearchableProfile, match: MatchRow) {
    const reasons: string[] = [];
    const sharedTags = intersection(profile.tags, match.tags);

    if (sharedTags.length) {
      reasons.push(`Skupne oznake: ${sharedTags.join(', ')}`);
    }

    return reasons.length ? reasons : ['Semantično podobne oznake'];
  }
}

function intersection(left?: string[], right?: string[]) {
  const rightSet = new Set(right ?? []);
  return (left ?? []).filter((value) => rightSet.has(value));
}

function hasTags(profile: SearchableProfile) {
  return (profile.tags ?? []).some((tag) => tag.trim().length > 0);
}
