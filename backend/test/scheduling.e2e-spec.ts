import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SchedulingController } from '../src/scheduling/scheduling.controller';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { FirebaseAuthGuard } from '../src/common/guards/firebase-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { FirebaseService } from '../src/firebase/firebase.service';
import { UsersRepository } from '../src/users/users.repository';
import { Reflector } from '@nestjs/core';

describe('SchedulingController (e2e-like routes)', () => {
  let app: INestApplication<App>;

  const serviceMock = {
    createRoom: jest.fn(),
    listRooms: jest.fn(),
    listAllRooms: jest.fn(),
    updateRoom: jest.fn(),
    deleteRoom: jest.fn(),
    generateTimeSlots: jest.fn(),
    listTimeSlots: jest.fn(),
    updateTimeSlot: jest.fn(),
    deleteTimeSlot: jest.fn(),
    assignMeeting: jest.fn(),
    listMeetings: jest.fn(),
    updateMeetingStatus: jest.fn(),
    deleteMeeting: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        {
          provide: SchedulingService,
          useValue: serviceMock,
        },
        {
          provide: FirebaseService,
          useValue: {
            getAuth: () => ({
              verifyIdToken: async () => ({ uid: 'admin-uid', email: 'admin@example.com' }),
            }),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: async () => ({ uid: 'admin-uid', role: 'admin' }),
          },
        },
        Reflector,
        FirebaseAuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('POST /scheduling/rooms', async () => {
    serviceMock.createRoom.mockResolvedValue({
      id: 'room-1',
      name: 'Room A',
      capacity: 8,
      active: true,
    });

    await request(app.getHttpServer())
      .post('/scheduling/rooms')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Room A', capacity: 8, active: true })
      .expect(201);

    expect(serviceMock.createRoom).toHaveBeenCalled();
  });

  it('POST /scheduling/time-slots/generate', async () => {
    serviceMock.generateTimeSlots.mockResolvedValue({
      generatedCount: 2,
      existingCount: 0,
      slots: [],
    });

    await request(app.getHttpServer())
      .post('/scheduling/time-slots/generate')
      .set('Authorization', 'Bearer test-token')
      .send({
        startDate: '2026-06-10',
        endDate: '2026-06-10',
        dayStartTime: '09:00',
        dayEndTime: '10:00',
        slotDurationMinutes: 30,
      })
      .expect(201);

    expect(serviceMock.generateTimeSlots).toHaveBeenCalled();
  });

  it('POST /scheduling/meetings/assign', async () => {
    serviceMock.assignMeeting.mockResolvedValue({
      id: 'meeting-1',
      roomId: 'room-1',
      slotId: 'slot-1',
      requestedByUids: ['u1'],
      requestedToUids: ['u2'],
      participantUids: ['u1', 'u2'],
      status: 'scheduled',
    });

    await request(app.getHttpServer())
      .post('/scheduling/meetings/assign')
      .set('Authorization', 'Bearer test-token')
      .send({
        roomId: 'room-1',
        slotId: 'slot-1',
        requestedByUids: ['u1'],
        requestedToUids: ['u2'],
      })
      .expect(201);

    expect(serviceMock.assignMeeting).toHaveBeenCalled();
  });

  it('PATCH /scheduling/meetings/:id/status', async () => {
    serviceMock.updateMeetingStatus.mockResolvedValue({
      message: 'Meeting status updated successfully',
    });

    await request(app.getHttpServer())
      .patch('/scheduling/meetings/meeting-1/status')
      .set('Authorization', 'Bearer test-token')
      .send({ status: 'completed' })
      .expect(200);

    expect(serviceMock.updateMeetingStatus).toHaveBeenCalledWith('meeting-1', {
      status: 'completed',
    });
  });

  it('DELETE /scheduling/meetings/:id', async () => {
    serviceMock.deleteMeeting.mockResolvedValue({
      message: 'Meeting deleted successfully',
    });

    await request(app.getHttpServer())
      .delete('/scheduling/meetings/meeting-1')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(serviceMock.deleteMeeting).toHaveBeenCalledWith('meeting-1');
  });
});
