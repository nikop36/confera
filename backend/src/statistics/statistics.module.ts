import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { CareerInterviewsModule } from '../career-interviews/career-interviews.module';
import { UsersModule } from '../users/users.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    SchedulingModule,
    CareerInterviewsModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
