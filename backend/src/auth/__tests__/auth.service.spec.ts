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
  const mockFindByEmailOrNull = jest.fn().mockResolvedValue(null); // default — no guest exists
  const mockUpgradeGuestToParticipant = jest.fn().mockResolvedValue(undefined);
  const mockFindByUidOrNull = jest.fn().mockResolvedValue(null);
  const mockMarkLoginActivity = jest.fn().mockResolvedValue(undefined);
  const originalFetch = global.fetch;

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
            findByEmailOrNull: mockFindByEmailOrNull,
            upgradeGuestToParticipant: mockUpgradeGuestToParticipant,
            findByUidOrNull: mockFindByUidOrNull,
            markLoginActivity: mockMarkLoginActivity,
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

  afterEach(() => {
    jest.clearAllMocks();
    mockFindByEmailOrNull.mockResolvedValue(null); // reset to default after each test
    mockFindByUidOrNull.mockResolvedValue(null);
    mockMarkLoginActivity.mockResolvedValue(undefined);
    global.fetch = originalFetch;
  });

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

  describe('login()', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          idToken: 'firebase-token',
          localId: 'firebase-uid-123',
        }),
      });
    });

    it('returns the Firebase token even if Firestore profile sync fails', async () => {
      mockFindByUidOrNull.mockRejectedValue(
        new Error('8 RESOURCE_EXHAUSTED: Quota exceeded.'),
      );

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Strongpass1!',
      });

      expect(result).toEqual({
        idToken: 'firebase-token',
        uid: 'firebase-uid-123',
      });
    });
  });
});
