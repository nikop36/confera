import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { FirebaseUser } from '../interfaces/firebase-user.interface';
import { UsersRepository } from '../../users/users.repository';

interface AuthenticatedRequest extends Request {
  user?: FirebaseUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const firebaseUser = request.user;
    if (!firebaseUser) {
      throw new UnauthorizedException('Authentication is required');
    }

    const user = await this.usersRepository.findByUid(firebaseUser.uid);
    if (!user) throw new ForbiddenException('User not found');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
