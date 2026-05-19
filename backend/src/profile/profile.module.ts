import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [FirebaseModule, UsersModule, MatchingModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
