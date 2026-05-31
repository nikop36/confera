import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuestsController, GuestsPublicController } from './guest.controller';
import { GuestsService } from './guest.service';
import { GuestInvitationsRepository } from './guest.repository';

@Module({
  imports: [FirebaseModule, UsersModule, EventsModule, NotificationsModule],
  controllers: [GuestsController, GuestsPublicController],
  providers: [GuestsService, GuestInvitationsRepository],
})
export class GuestsModule {}
