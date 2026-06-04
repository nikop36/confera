import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { Event } from '../common/interfaces/event.interface';
import { EmbeddingService } from '../matching/embedding.service';

type EventSemanticRow = {
  event_id: string;
  score: number;
};

@Injectable()
export class EventIndexService {
  private readonly logger = new Logger(EventIndexService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  get enabled() {
    return this.databaseService.enabled;
  }

  async upsertEvent(event: Event): Promise<void> {
    if (!this.databaseService.enabled) return;

    const eventText = this.buildEventText(event);
    const eventHash = this.hashEventText(eventText);
    const embedding = this.embeddingService.toSqlVector(
      this.embeddingService.createEmbedding(eventText),
    );

    await this.databaseService.query(
      `
      insert into event_profile_index (
        event_id,
        title,
        description,
        location,
        tags,
        start_at,
        end_at,
        capacity,
        registered_count,
        event_text,
        event_embedding,
        embedding_model,
        event_hash,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11::vector, $12, $13, now()
      )
      on conflict (event_id) do update set
        title = excluded.title,
        description = excluded.description,
        location = excluded.location,
        tags = excluded.tags,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        capacity = excluded.capacity,
        registered_count = excluded.registered_count,
        event_text = excluded.event_text,
        event_embedding = case
          when event_profile_index.event_hash = excluded.event_hash
          then event_profile_index.event_embedding
          else excluded.event_embedding
        end,
        embedding_model = excluded.embedding_model,
        event_hash = excluded.event_hash,
        updated_at = now()
      `,
      [
        event.id,
        event.title,
        event.description,
        event.location,
        event.tags ?? [],
        event.startAt,
        event.endAt,
        event.capacity,
        event.registeredCount,
        eventText,
        embedding,
        this.embeddingService.model,
        eventHash,
      ],
    );
  }

  async safeUpsertEvent(event: Event): Promise<void> {
    try {
      await this.upsertEvent(event);
    } catch (error) {
      this.logger.warn(
        `Event was saved, but event index sync failed for ${event.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async removeEvent(eventId: string): Promise<void> {
    if (!this.databaseService.enabled) return;
    await this.databaseService.query(
      `delete from event_profile_index where event_id = $1`,
      [eventId],
    );
  }

  async safeRemoveEvent(eventId: string): Promise<void> {
    try {
      await this.removeEvent(eventId);
    } catch (error) {
      this.logger.warn(
        `Event index delete failed for ${eventId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async semanticSearchEvents(
    queryText: string,
    limit = 40,
  ): Promise<EventSemanticRow[]> {
    if (!this.databaseService.enabled) return [];

    const embedding = this.embeddingService.toSqlVector(
      this.embeddingService.createEmbedding(queryText),
    );
    const result = await this.databaseService.query<EventSemanticRow>(
      `select * from semantic_event_search($1::vector, now(), $2)`,
      [embedding, limit],
    );
    return result.rows;
  }

  private buildEventText(event: Event): string {
    return [
      event.title,
      event.description,
      event.location,
      ...(event.tags ?? []),
    ]
      .filter(Boolean)
      .join(' | ');
  }

  private hashEventText(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
