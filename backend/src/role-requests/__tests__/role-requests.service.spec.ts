import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleRequestsService } from '../role-requests.service';
import { RoleRequestsRepository } from '../role-requests.repository';
import { UsersRepository } from '../../users/users.repository';
import { UserRoleEnum } from '../../common/enums/roles.enum';
import type { FirebaseUser } from '../../common/interfaces/firebase-user.interface';
import type { RoleRequest } from '../../common/interfaces/role-request.interface';
import type { User } from '../../common/interfaces/user.interface';

describe('RoleRequestsService', () => {
  let service: RoleRequestsService;

  const mockSaveRoleRequest = jest.fn();
  const mockFindAllPending = jest.fn();
  const mockFindPendingByUid = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockFindByUid = jest.fn();
  const mockUpdateUserRole = jest.fn();

  const mockUser: FirebaseUser = {
    uid: 'user-uid-123',
    email: 'test@example.com',
  };

  const mockAdminUser: FirebaseUser = {
    uid: 'admin-uid-456',
    email: 'admin@example.com',
  };

  const mockParticipant: Partial<User> = {
    uid: 'user-uid-123',
    email: 'test@example.com',
    role: UserRoleEnum.PARTICIPANT,
  };

  const mockOrganizer: Partial<User> = {
    uid: 'user-uid-123',
    email: 'test@example.com',
    role: UserRoleEnum.ORGANIZER,
  };

  const mockPendingRequest: RoleRequest = {
    id: 'request-id-789',
    uid: 'user-uid-123',
    email: 'test@example.com',
    requestedRole: UserRoleEnum.ORGANIZER,
    reason: 'Organiziram konferenco',
    status: 'pending',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleRequestsService,
        {
          provide: RoleRequestsRepository,
          useValue: {
            saveRoleRequest: mockSaveRoleRequest,
            findAllPending: mockFindAllPending,
            findPendingByUid: mockFindPendingByUid,
            findById: mockFindById,
            updateStatus: mockUpdateStatus,
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindByUid,
            updateUserRole: mockUpdateUserRole,
          },
        },
      ],
    }).compile();

    service = module.get<RoleRequestsService>(RoleRequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createRoleRequest ───────────────────────────────────────────────────────

  describe('createRoleRequest()', () => {
    it('should save and return a new role request for a participant', async () => {
      mockFindByUid.mockResolvedValue(mockParticipant);
      mockFindPendingByUid.mockResolvedValue(null);
      mockSaveRoleRequest.mockResolvedValue(mockPendingRequest);

      const result = await service.createRoleRequest(mockUser, {
        requestedRole: UserRoleEnum.ORGANIZER,
        reason: 'Organiziram konferenco',
      });

      expect(result).toEqual(mockPendingRequest);
      expect(mockSaveRoleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: mockUser.uid,
          email: mockUser.email,
          requestedRole: UserRoleEnum.ORGANIZER,
          status: 'pending',
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockFindByUid.mockResolvedValue(null);

      await expect(
        service.createRoleRequest(mockUser, {
          requestedRole: UserRoleEnum.ORGANIZER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockFindByUid.mockResolvedValue(mockOrganizer);

      await expect(
        service.createRoleRequest(mockUser, {
          requestedRole: UserRoleEnum.INDUSTRY,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when user already has a pending request', async () => {
      mockFindByUid.mockResolvedValue(mockParticipant);
      mockFindPendingByUid.mockResolvedValue(mockPendingRequest);

      await expect(
        service.createRoleRequest(mockUser, {
          requestedRole: UserRoleEnum.ORGANIZER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getPendingRequests ──────────────────────────────────────────────────────

  describe('getPendingRequests()', () => {
    it('should return all pending requests', async () => {
      mockFindAllPending.mockResolvedValue([mockPendingRequest]);

      const result = await service.getPendingRequests();

      expect(result).toEqual([mockPendingRequest]);
      expect(mockFindAllPending).toHaveBeenCalled();
    });

    it('should return empty array when no pending requests exist', async () => {
      mockFindAllPending.mockResolvedValue([]);

      const result = await service.getPendingRequests();

      expect(result).toEqual([]);
    });
  });

  // ─── approveRequest ──────────────────────────────────────────────────────────

  describe('approveRequest()', () => {
    it('should update request status and user role on approval', async () => {
      mockFindById.mockResolvedValue(mockPendingRequest);
      mockUpdateStatus.mockResolvedValue(undefined);
      mockUpdateUserRole.mockResolvedValue(undefined);

      await service.approveRequest('request-id-789', mockAdminUser);

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'request-id-789',
        'approved',
        mockAdminUser.uid,
      );
      expect(mockUpdateUserRole).toHaveBeenCalledWith(
        mockPendingRequest.uid,
        mockPendingRequest.requestedRole,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        service.approveRequest('non-existent-id', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when request is already reviewed', async () => {
      mockFindById.mockResolvedValue({
        ...mockPendingRequest,
        status: 'approved',
      });

      await expect(
        service.approveRequest('request-id-789', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectRequest ───────────────────────────────────────────────────────────

  describe('rejectRequest()', () => {
    it('should update request status to rejected', async () => {
      mockFindById.mockResolvedValue(mockPendingRequest);
      mockUpdateStatus.mockResolvedValue(undefined);

      await service.rejectRequest('request-id-789', mockAdminUser);

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'request-id-789',
        'rejected',
        mockAdminUser.uid,
      );
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        service.rejectRequest('non-existent-id', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when request is already reviewed', async () => {
      mockFindById.mockResolvedValue({
        ...mockPendingRequest,
        status: 'rejected',
      });

      await expect(
        service.rejectRequest('request-id-789', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
