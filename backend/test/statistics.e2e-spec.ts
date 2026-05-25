import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { StatisticsController } from '../src/statistics/statistics.controller';
import { StatisticsService } from '../src/statistics/statistics.service';
import { FirebaseAuthGuard } from '../src/common/guards/firebase-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { FirebaseService } from '../src/firebase/firebase.service';
import { UsersRepository } from '../src/users/users.repository';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('StatisticsController (e2e-like routes)', () => {
  let app: INestApplication<App>;

  const statisticsServiceMock = {
    getRoomOccupancyStats: jest.fn(),
    getConfirmedMeetingsStats: jest.fn(),
    getHealthSummary: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: statisticsServiceMock,
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
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /statistics/room-occupancy', async () => {
    statisticsServiceMock.getRoomOccupancyStats.mockResolvedValue({
      summary: { roomsCount: 1 },
      rooms: [],
    });

    await request(app.getHttpServer())
      .get(
        '/statistics/room-occupancy?from=2026-05-20T00:00:00.000Z&to=2026-05-21T00:00:00.000Z',
      )
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(statisticsServiceMock.getRoomOccupancyStats).toHaveBeenCalled();
  });

  it('GET /statistics/confirmed-meetings', async () => {
    statisticsServiceMock.getConfirmedMeetingsStats.mockResolvedValue({
      summary: { confirmedTotalCount: 3 },
      series: [],
      heatmap: [],
      funnel: [],
      anomalies: [],
      drilldown: [],
    });

    await request(app.getHttpServer())
      .get('/statistics/confirmed-meetings')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(statisticsServiceMock.getConfirmedMeetingsStats).toHaveBeenCalled();
  });

  it('GET /statistics/health', async () => {
    statisticsServiceMock.getHealthSummary.mockResolvedValue({
      ok: true,
      checkedAt: '2026-05-24T00:00:00.000Z',
      modules: {
        schedulingRepository: true,
        careerInterviewsRepository: true,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/statistics/health')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    const payload = response.body as { ok?: boolean };
    expect(payload.ok).toBe(true);
  });

  it('returns structured error payload on bad request', async () => {
    statisticsServiceMock.getConfirmedMeetingsStats.mockRejectedValue(
      new BadRequestException('Invalid from/to date'),
    );

    const response = await request(app.getHttpServer())
      .get(
        '/statistics/confirmed-meetings?from=invalid&to=2026-05-21T00:00:00.000Z',
      )
      .set('Authorization', 'Bearer test-token')
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        errorCode: 'BAD_REQUEST',
        error: true,
      }),
    );
  });
});
