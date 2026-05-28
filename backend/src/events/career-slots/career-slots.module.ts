import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../../users/users.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { CareerSlotsController } from './career-slots.controller';
import { CareerSlotsService } from './career-slots.service';
import { CareerSlotsRepository } from './career-slots.repository';

@Module({
  imports: [FirebaseModule, UsersModule, NotificationsModule],
  controllers: [CareerSlotsController],
  providers: [CareerSlotsService, CareerSlotsRepository],
})
export class CareerSlotsModule {}
