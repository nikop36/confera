import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnalyticsController } from '../src/analytics/analytics.controller';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { FirebaseAuthGuard } from '../src/common/guards/firebase-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { FirebaseService } from '../src/firebase/firebase.service';
import { UsersRepository } from '../src/users/users.repository';

describe('AnalyticsController (e2e-like routes)', () => {
  let app: INestApplication<App>;

  const analyticsServiceMock = {
    getOverview: jest.fn(),
    getUsageTrend: jest.fn(),
    getMatchingPerformance: jest.fn(),
    getEngagement: jest.fn(),
    getReportJson: jest.fn(),
    getReportCsv: jest.fn(),
  };

  const usersRepositoryMock = {
    findByUid: jest.fn(),
  };

  beforeEach(async () => {
    usersRepositoryMock.findByUid.mockReturnValue({
      uid: 'admin-uid',
      role: 'admin',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: analyticsServiceMock,
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
          useValue: usersRepositoryMock,
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

  it('GET /analytics/overview for admin', async () => {
    analyticsServiceMock.getOverview.mockResolvedValue({
      summary: { usersTotal: 3 },
    });

    await request(app.getHttpServer())
      .get('/analytics/overview')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
  });

  it('GET /analytics/report?format=csv', async () => {
    analyticsServiceMock.getReportCsv.mockResolvedValue(
      'section,metric,value\n',
    );

    await request(app.getHttpServer())
      .get('/analytics/report?format=csv&section=matching')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(analyticsServiceMock.getReportCsv).toHaveBeenCalledWith(
      undefined,
      undefined,
      'matching',
    );
  });

  it('blocks non-admin role', async () => {
    usersRepositoryMock.findByUid.mockReturnValue({
      uid: 'organizer-uid',
      role: 'organizer',
    });

    await request(app.getHttpServer())
      .get('/analytics/overview')
      .set('Authorization', 'Bearer test-token')
      .expect(403);
  });
});
