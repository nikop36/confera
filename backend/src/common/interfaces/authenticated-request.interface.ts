import { Request } from 'express';
import { FirebaseUser } from '../interfaces/firebase-user.interface';

export interface AuthenticatedRequest extends Request {
  user: FirebaseUser;
}
