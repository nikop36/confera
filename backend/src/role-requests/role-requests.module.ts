import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersRepository } from '../users/users.repository';
import { RoleRequestsService } from './role-requests.service';
import { RoleRequestsRepository } from './role-requests.repository';
import { RoleRequestController } from './role-requests.controller';

@Module({
  imports: [FirebaseModule],
  providers: [RoleRequestsService, UsersRepository, RoleRequestController],
  exports: [RoleRequestsRepository, RoleRequestsService],
})
export class UsersModule {}
