import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../../users/users.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
