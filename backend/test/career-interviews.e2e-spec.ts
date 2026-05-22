import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Reflector } from '@nestjs/core';
import { CareerInterviewsController } from '../src/career-interviews/career-interviews.controller';
import { CareerInterviewsService } from '../src/career-interviews/career-interviews.service';
import { FirebaseAuthGuard } from '../src/common/guards/firebase-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { FirebaseService } from '../src/firebase/firebase.service';
import { UsersRepository } from '../src/users/users.repository';

describe('CareerInterviewsController (e2e-like routes)', () => {
  let app: INestApplication<App>;

  const serviceMock = {
    create: jest.fn(),
    list: jest.fn(),
    assign: jest.fn(),
    updateStatus: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CareerInterviewsController],
      providers: [
        {
          provide: CareerInterviewsService,
          useValue: serviceMock,
        },
        {
          provide: FirebaseService,
          useValue: {
            getAuth: () => ({
              verifyIdToken: () => ({
                uid: 'admin-uid',
                email: 'admin@example.com',
              }),
            }),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: () => ({ uid: 'admin-uid', role: 'admin' }),
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

  it('POST /career-interviews', async () => {
    serviceMock.create.mockResolvedValue({
      id: 'ci-1',
      candidateUid: 'candidate-1',
      status: 'draft',
    });

    await request(app.getHttpServer())
      .post('/career-interviews')
      .set('Authorization', 'Bearer test-token')
      .send({ candidateUid: 'candidate-1', notes: 'note' })
      .expect(201);

    expect(serviceMock.create).toHaveBeenCalled();
  });

  it('PATCH /career-interviews/:id/assign', async () => {
    serviceMock.assign.mockResolvedValue({
      message: 'Career interview assigned successfully',
    });

    await request(app.getHttpServer())
      .patch('/career-interviews/ci-1/assign')
      .set('Authorization', 'Bearer test-token')
      .send({
        interviewerUid: 'interviewer-1',
        roomId: 'room-1',
        slotId: 'slot-1',
      })
      .expect(200);

    expect(serviceMock.assign).toHaveBeenCalled();
  });

  it('PATCH /career-interviews/:id/status', async () => {
    serviceMock.updateStatus.mockResolvedValue({
      message: 'Career interview status updated successfully',
    });

    await request(app.getHttpServer())
      .patch('/career-interviews/ci-1/status')
      .set('Authorization', 'Bearer test-token')
      .send({ status: 'cancelled' })
      .expect(200);

    expect(serviceMock.updateStatus).toHaveBeenCalled();
  });
});
