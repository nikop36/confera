import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { InvitesService } from './invites.service';
import { RespondInviteDto } from './dto/respond-invite.dto';

@ApiTags('invites')
@Controller('invites')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('me')
  @ApiOperation({ summary: 'List my interview invites' })
  @ApiResponse({ status: 200, description: 'Invites returned' })
  async getMyInvites(@CurrentUser() user: FirebaseUser) {
    return this.invitesService.getMyInvites(user);
  }

  @Patch(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject an invite' })
  @ApiResponse({ status: 200, description: 'Invite response saved' })
  async respond(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body() dto: RespondInviteDto,
  ) {
    return this.invitesService.respondToInvite(user, id, dto.action);
  }
}
