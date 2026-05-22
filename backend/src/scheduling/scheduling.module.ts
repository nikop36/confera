import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingRepository } from './scheduling.repository';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [SchedulingController],
  providers: [SchedulingRepository, SchedulingService],
  exports: [SchedulingService, SchedulingRepository],
})
export class SchedulingModule {}
