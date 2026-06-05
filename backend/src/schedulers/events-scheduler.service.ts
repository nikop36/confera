import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';

@Injectable()
export class EventsSchedulerService {
  private readonly logger = new Logger(EventsSchedulerService.name);

  constructor(private readonly eventsService: EventsService) {}

  @Cron('0 2 * * *')
  async purgeExpiredEvents() {
    const count = await this.eventsService.purgeExpiredEvents();

    this.logger.log(`Archived ${count} expired events`);
  }
}
