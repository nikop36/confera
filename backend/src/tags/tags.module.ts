import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRepository } from './tags.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [TagsController],
  providers: [TagsService, TagsRepository],
  exports: [TagsRepository],
})
export class TagsModule {}
