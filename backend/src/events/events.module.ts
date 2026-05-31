import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { SessionsModule } from './sessions/sessions.module';
import { ConnectionsModule } from '../connections/connections.module';
import { CareerSlotsModule } from './career-slots/career-slots.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmbeddingService } from '../matching/embedding.service';
import { EventIndexService } from './event-index.service';

@Module({
  imports: [
    FirebaseModule,
    DatabaseModule,
    UsersModule,
    SessionsModule,
    ConnectionsModule,
    CareerSlotsModule,
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventsRepository,
    EmbeddingService,
    EventIndexService,
  ],
  exports: [EventsRepository],
})
export class EventsModule {}
