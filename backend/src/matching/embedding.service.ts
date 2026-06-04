import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

const EMBEDDING_DIMENSIONS = 384;

@Injectable()
export class EmbeddingService {
  readonly model = 'prototype-local-hash-384-v1';

  // Prototype embedding provider for Issue 11. It keeps the pgvector pipeline
  // testable without an external AI API and should be replaced by a real
  // embedding model before evaluating recommendation quality.
  createEmbedding(text: string): number[] {
    const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      const hash = createHash('sha256').update(token).digest();
      const index = hash.readUInt16BE(0) % EMBEDDING_DIMENSIONS;
      const sign = hash[2] % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    }

    return this.normalize(vector);
  }

  toSqlVector(vector: number[]) {
    return `[${vector.map((value) => Number(value.toFixed(6))).join(',')}]`;
  }

  private tokenize(text: string) {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 1);
  }

  private normalize(vector: number[]) {
    const length = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (!length) return vector;

    return vector.map((value) => value / length);
  }
}
