import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchingModule } from '../matching/matching.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsRepository } from './connections.repository';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    NotificationsModule,
    MatchingModule,
    SchedulingModule,
  ],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository],
  exports: [ConnectionsService, ConnectionsRepository],
})
export class ConnectionsModule {}
