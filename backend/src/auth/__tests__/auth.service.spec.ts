import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let authService: AuthService;

  const mockCreateUser = jest.fn();
  const mockUsersServiceCreate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: FirebaseService,
          useValue: {
            getAuth: () => ({ createUser: mockCreateUser }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            createUser: mockUsersServiceCreate,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('fake-api-key'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Registration ────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('should return uid and email on successful registration', async () => {
      mockCreateUser.mockResolvedValue({ uid: 'firebase-uid-123' });
      mockUsersServiceCreate.mockResolvedValue(undefined);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Strongpass1!',
        displayName: 'Test User',
      });

      expect(result).toEqual({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        role: 'participant',
      });
    });

    it('should call Firebase createUser with the correct data', async () => {
      mockCreateUser.mockResolvedValue({ uid: 'firebase-uid-123' });
      mockUsersServiceCreate.mockResolvedValue(undefined);

      await authService.register({
        email: 'test@example.com',
        password: 'Strongpass1!',
        displayName: 'Test User',
      });

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Strongpass1!',
        displayName: 'Test User',
      });
    });

    it('should save user with participant role and incomplete profile status', async () => {
      mockCreateUser.mockResolvedValue({ uid: 'firebase-uid-123' });
      mockUsersServiceCreate.mockResolvedValue(undefined);

      await authService.register({
        email: 'test@example.com',
        password: 'Strongpass1!',
        displayName: 'Test User',
      });

      expect(mockUsersServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'firebase-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'participant',
          profileStatus: 'incomplete',
          createdAt: expect.any(Date) as Date,
        }),
      );
    });

    it('should throw ConflictException when email is already registered', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-exists' });

      await expect(
        authService.register({
          email: 'duplicate@example.com',
          password: 'Strongpass1!',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on an unexpected Firebase error', async () => {
      mockCreateUser.mockRejectedValue(new Error('Firebase internal error'));

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Strongpass1!',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should not call UsersService if Firebase Auth creation fails', async () => {
      mockCreateUser.mockRejectedValue(new Error('Firebase internal error'));

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Strongpass1!',
          displayName: 'Test User',
        }),
      ).rejects.toThrow();

      expect(mockUsersServiceCreate).not.toHaveBeenCalled();
    });
  });
});
