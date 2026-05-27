import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { SessionsModule } from './sessions/sessions.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [FirebaseModule, UsersModule, SessionsModule, ConnectionsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}
