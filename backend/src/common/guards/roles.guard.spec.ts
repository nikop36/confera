import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersRepository } from '../../users/users.repository';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const findByUid = jest.fn();
  const reflector = {
    getAllAndOverride,
  } as unknown as Reflector;
  const usersRepository = {
    findByUid,
  } as unknown as UsersRepository;
  const guard = new RolesGuard(reflector, usersRepository);
  const handler = jest.fn();
  class TestController {}

  function createContext(user?: { uid: string; email: string }) {
    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows routes without role metadata', async () => {
    getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(findByUid).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests on role-protected routes', async () => {
    getAllAndOverride.mockReturnValue(['admin']);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects authenticated users missing from the application database', async () => {
    getAllAndOverride.mockReturnValue(['admin']);
    findByUid.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({ uid: 'missing-user', email: 'missing@example.com' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects users whose role is not allowed', async () => {
    getAllAndOverride.mockReturnValue(['admin']);
    findByUid.mockResolvedValue({ uid: 'user-1', role: 'participant' });

    await expect(
      guard.canActivate(
        createContext({ uid: 'user-1', email: 'user@example.com' }),
      ),
    ).rejects.toThrow('Insufficient permissions');
  });

  it('allows users whose role is included in route metadata', async () => {
    getAllAndOverride.mockReturnValue(['admin', 'organizer']);
    findByUid.mockResolvedValue({ uid: 'user-1', role: 'organizer' });

    await expect(
      guard.canActivate(
        createContext({ uid: 'user-1', email: 'user@example.com' }),
      ),
    ).resolves.toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith('roles', [
      handler,
      TestController,
    ]);
  });
});
