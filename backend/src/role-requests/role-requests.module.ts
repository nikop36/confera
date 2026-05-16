import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { RoleRequestsService } from './role-requests.service';
import { RoleRequestsRepository } from './role-requests.repository';
import { RoleRequestController } from './role-requests.controller';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [RoleRequestController],
  providers: [RoleRequestsService, RoleRequestsRepository],
  exports: [RoleRequestsService],
})
export class RoleRequestsModule {}
