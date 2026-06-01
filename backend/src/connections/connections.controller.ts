import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { GraphResponseDto } from './dto/graph-response.dto';
import { CreateConnectionRequestDto } from './dto/create-connection-request.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('connections')
@Controller('connections')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send connection request' })
  @ApiResponse({ status: 201, description: 'Connection request sent' })
  async sendRequest(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: CreateConnectionRequestDto,
  ) {
    return this.connectionsService.sendRequest(user, dto.recipientUid);
  }

  @Patch('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve connection request' })
  @ApiResponse({ status: 200, description: 'Connection request approved' })
  async approveRequest(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.connectionsService.approveRequest(user, id);
  }

  @Patch('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject connection request' })
  @ApiResponse({ status: 200, description: 'Connection request rejected' })
  async rejectRequest(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.connectionsService.rejectRequest(user, id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get connection requests and approved connections' })
  @ApiResponse({ status: 200, description: 'Connections returned' })
  async getMyConnections(@CurrentUser() user: FirebaseUser) {
    return this.connectionsService.getMyConnections(user);
  }

  @Get('accepted-pairs')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List accepted connection pairs' })
  @ApiResponse({
    status: 200,
    description: 'Accepted connection pairs returned',
  })
  async getAcceptedPairs() {
    return this.connectionsService.listAcceptedPairs();
  }

  @Get('graph/me')
  @ApiOperation({ summary: 'Get ego network graph for current user' })
  @ApiResponse({
    status: 200,
    description: 'Graph nodes and edges returned',
    type: GraphResponseDto,
  })
  async getGraph(@CurrentUser() user: FirebaseUser) {
    return this.connectionsService.getGraph(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove accepted connection' })
  @ApiResponse({ status: 200, description: 'Connection removed' })
  async removeConnection(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.connectionsService.removeConnection(user, id);
  }
}
