import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { EventsExportController } from './events-export.controller';
import { EventsExportService } from './events-export.service';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [FirebaseModule, UsersModule, EventsModule, ConnectionsModule, NotificationsModule],
  controllers: [ExportController, EventsExportController],
  providers: [ExportService, EventsExportService],
})
export class ExportModule {}
