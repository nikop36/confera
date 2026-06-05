import { FirebaseService } from '../../firebase/firebase.service';
import { RoleRequestsRepository } from '../role-requests.repository';
import { UserRoleEnum } from '../../common/enums/roles.enum';

describe('RoleRequestsRepository', () => {
  const getMock = jest.fn();
  const orderByMock = jest.fn(() => ({ get: getMock }));
  const whereMock = jest.fn(() => ({ orderBy: orderByMock }));
  const collectionMock = jest.fn(() => ({ where: whereMock }));
  const firestoreMock = { collection: collectionMock };

  const firebaseService = {
    getFirestore: jest.fn(() => firestoreMock),
  } as unknown as FirebaseService;

  let repository: RoleRequestsRepository;

  beforeEach(() => {
    repository = new RoleRequestsRepository(firebaseService);
    jest.clearAllMocks();
  });

  it('normalizes Firestore timestamp fields to Date instances', async () => {
    const createdAt = new Date('2026-06-05T10:00:00.000Z');
    const reviewedAt = new Date('2026-06-05T11:00:00.000Z');
    getMock.mockResolvedValue({
      docs: [
        {
          id: 'request-1',
          data: () => ({
            uid: 'user-1',
            email: 'user@example.com',
            requestedRole: UserRoleEnum.ORGANIZER,
            status: 'pending',
            reason: 'I organize sessions.',
            createdAt: { toDate: () => createdAt },
            reviewedAt: { seconds: Math.floor(reviewedAt.getTime() / 1000) },
          }),
        },
      ],
    });

    const result = await repository.findAllPending();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'request-1',
      uid: 'user-1',
      email: 'user@example.com',
      requestedRole: UserRoleEnum.ORGANIZER,
      status: 'pending',
      reason: 'I organize sessions.',
    });
    expect(result[0]?.createdAt).toEqual(createdAt);
    expect(result[0]?.reviewedAt).toEqual(reviewedAt);
  });
});
