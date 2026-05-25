import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { RoleRequestsModule } from './role-requests/role-requests.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportModule } from './export/export.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ConnectionsModule } from './connections/connections.module';
import { CareerInterviewsModule } from './career-interviews/career-interviews.module';
import { InvitesModule } from './invites/invites.module';
import { StatisticsModule } from './statistics/statistics.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    RoleRequestsModule,
    MatchingModule,
    NotificationsModule,
    ExportModule,
    SchedulingModule,
    ConnectionsModule,
    CareerInterviewsModule,
    InvitesModule,
    StatisticsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
