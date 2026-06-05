import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';

describe('FirebaseAuthGuard', () => {
  const verifyIdToken = jest.fn();
  const firebaseService = {
    getAuth: () => ({ verifyIdToken }),
  } as unknown as FirebaseService;
  const guard = new FirebaseAuthGuard(firebaseService);

  function createContext(authorization?: string): {
    context: ExecutionContext;
    request: {
      headers: { authorization?: string };
      user?: { uid: string; email: string };
    };
  } {
    const request = {
      headers: authorization ? { authorization } : {},
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    return { context, request };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request without an authorization header', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects malformed Bearer authorization headers', async () => {
    const { context } = createContext('Bearer token with spaces');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired Firebase tokens', async () => {
    verifyIdToken.mockRejectedValue(new Error('expired'));
    const { context } = createContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('attaches the verified user to the request', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
    });
    const { context, request } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({
      uid: 'user-1',
      email: 'user@example.com',
    });
  });
});
