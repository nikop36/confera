import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../../users/users.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [FirebaseModule, UsersModule, NotificationsModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
