import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../common/interfaces/user.interface';
import { FirebaseError } from '../common/interfaces/firebase-error.interface';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

function isFirebaseError(err: unknown): err is FirebaseError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ uid: string; email: string; role: string }> {
    let userRecord: admin.auth.UserRecord;

    try {
      userRecord = await this.firebaseService.getAuth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
      });
    } catch (err) {
      //console.log('Firebase error code:', (err as any).code);
      //console.log('Firebase error message:', (err as any).message);
      //console.log('Full error:', err);

      if (isFirebaseError(err) && err.code === 'auth/email-already-exists') {
        throw new ConflictException('Email already registered');
      }
      throw new InternalServerErrorException('Registration failed');
    }

    const user: User = {
      uid: userRecord.uid,
      email: dto.email,
      displayName: dto.displayName,
      // TODO: resolve role from inviteToken once InvitesModule is built
      role: 'participant',
      profileStatus: 'incomplete',
      createdAt: new Date(),
    };

    await this.usersService.createUser(user);

    return { uid: user.uid, email: user.email, role: user.role };
  }

  async login(dto: LoginDto): Promise<{ idToken: string; uid: string }> {
    const apiKey = this.configService.get<string>('FIREBASE_API_KEY');

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dto.email,
          password: dto.password,
          returnSecureToken: true,
        }),
      },
    );

    interface FirebaseLoginResponse {
      idToken?: string;
      localId?: string;
      error?: { message: string };
    }

    const data = (await res.json()) as FirebaseLoginResponse;

    //console.log('Firebase login response status:', res.status);
    //console.log('Firebase login response:', JSON.stringify(data));

    if (!res.ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { idToken: data.idToken ?? '', uid: data.localId ?? '' };
  }
}
