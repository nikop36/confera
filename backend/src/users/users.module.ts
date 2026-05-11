import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [FirebaseModule],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
