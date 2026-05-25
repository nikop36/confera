import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { CareerInterviewsModule } from '../career-interviews/career-interviews.module';
import { ConnectionsModule } from '../connections/connections.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    SchedulingModule,
    CareerInterviewsModule,
    ConnectionsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
