import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    const tokenMatch = /^Bearer ([^\s]+)$/u.exec(authHeader ?? '');
    const token = tokenMatch?.[1];

    if (!token) {
      throw new UnauthorizedException(
        'A valid Bearer authentication token is required',
      );
    }

    try {
      const decoded = await this.firebaseService.getAuth().verifyIdToken(token);
      request.user = { uid: decoded.uid, email: decoded.email ?? '' };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
