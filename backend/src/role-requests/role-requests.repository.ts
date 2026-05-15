import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class RoleRequestsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async saveRoleRequest() {}

  async findAllPending() {}

  async findById() {}

  async updateStatus() {}
}
