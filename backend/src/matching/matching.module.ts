import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { MatchingController } from './matching.controller';
import { MatchingIndexService } from './matching-index.service';
import { MatchingService } from './matching.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [DatabaseModule, FirebaseModule, UsersModule],
  controllers: [MatchingController],
  providers: [EmbeddingService, MatchingIndexService, MatchingService],
  exports: [MatchingIndexService],
})
export class MatchingModule {}
