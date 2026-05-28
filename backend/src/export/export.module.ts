import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { EventsExportController } from './events-export.controller';
import { EventsExportService } from './events-export.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [FirebaseModule, UsersModule, EventsModule],
  controllers: [ExportController, EventsExportController],
  providers: [ExportService, EventsExportService],
})
export class ExportModule {}
