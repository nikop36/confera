import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConnectionsModule } from '../connections/connections.module';
import { CareerInterviewsController } from './career-interviews.controller';
import { CareerInterviewsService } from './career-interviews.service';
import { CareerInterviewsRepository } from './career-interviews.repository';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    SchedulingModule,
    NotificationsModule,
    ConnectionsModule,
  ],
  controllers: [CareerInterviewsController],
  providers: [CareerInterviewsService, CareerInterviewsRepository],
})
export class CareerInterviewsModule {}
