import { PartialType } from '@nestjs/swagger';
import { CreateCareerSlotDto } from './create-career-slot.dto';

export class UpdateCareerSlotDto extends PartialType(CreateCareerSlotDto) {}
