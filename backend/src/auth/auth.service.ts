import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { UserRoleEnum } from '../common/enums/roles.enum';
import {
  normalizeDisplayName,
  normalizeEmail,
} from './validation/auth-input.validation';

function isFirebaseError(err: unknown): err is FirebaseError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ uid: string; email: string; role: string }> {
    const email = normalizeEmail(dto.email) as string;
    const displayName = normalizeDisplayName(dto.displayName) as string;
    this.assertPasswordDoesNotContainPersonalData(
      dto.password,
      email,
      displayName,
    );

    // Check for existing guest record before touching Firebase Auth
    const existingGuest = await this.usersService.findByEmailOrNull(email);

    if (existingGuest?.role === UserRoleEnum.GUEST) {
      if (existingGuest.guestStatus !== 'confirmed') {
        throw new ConflictException(
          'An invitation has been sent to this email. Please confirm it before registering.',
        );
      }
      // Guest is confirmed — create the Firebase Auth account and upgrade
      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await this.firebaseService.getAuth().createUser({
          email,
          password: dto.password,
          displayName,
        });
      } catch (err) {
        if (isFirebaseError(err) && err.code === 'auth/email-already-exists') {
          throw new ConflictException('Email already registered');
        }
        throw new InternalServerErrorException('Registration failed');
      }

      await this.usersService.upgradeGuestToParticipant(email, userRecord.uid);
      return {
        uid: userRecord.uid,
        email,
        role: UserRoleEnum.PARTICIPANT,
      };
    }

    //normal registration flow
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await this.firebaseService.getAuth().createUser({
        email,
        password: dto.password,
        displayName,
      });
    } catch (err) {
      if (isFirebaseError(err) && err.code === 'auth/email-already-exists') {
        throw new ConflictException('Email already registered');
      }
      throw new InternalServerErrorException('Registration failed');
    }

    const user: User = {
      uid: userRecord.uid,
      email,
      displayName,
      role: UserRoleEnum.PARTICIPANT,
      profileStatus: 'incomplete',
      createdAt: new Date(),
    };

    await this.usersService.createUser(user);

    return { uid: user.uid, email: user.email, role: user.role };
  }

  async login(dto: LoginDto): Promise<{ idToken: string; uid: string }> {
    const apiKey = this.configService.get<string>('FIREBASE_API_KEY');
    const email = normalizeEmail(dto.email) as string;

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
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

    if (!res.ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const idToken = data.idToken ?? '';
    const uid = data.localId ?? '';

    await this.syncUserAfterLogin(uid, email);

    return { idToken, uid };
  }

  private async syncUserAfterLogin(uid: string, email: string): Promise<void> {
    try {
      const existing = await this.usersService.findByUidOrNull(uid);
      if (!existing) {
        await this.usersService.createUser({
          uid,
          email,
          displayName: email.split('@')[0],
          role: UserRoleEnum.PARTICIPANT,
          profileStatus: 'incomplete',
          createdAt: new Date(),
        });
      }
      await this.usersService.markLoginActivity(uid);
    } catch (error) {
      this.logger.warn(
        `Firebase login succeeded, but user profile sync failed for ${uid}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private assertPasswordDoesNotContainPersonalData(
    password: string,
    email: string,
    displayName: string,
  ): void {
    const passwordLower = password.toLowerCase();
    const personalValues = [
      email.split('@')[0],
      ...displayName.toLowerCase().split(/[\s.'’-]+/u),
    ].filter((value) => value.length >= 3);

    if (personalValues.some((value) => passwordLower.includes(value))) {
      throw new BadRequestException(
        'Password must not contain your email address or name.',
      );
    }
  }
}
