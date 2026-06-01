import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../common/enums/roles.enum';

export class GraphNodeDto {
  @ApiProperty({ example: 'user-123' })
  id!: string;

  @ApiProperty({ enum: ['self', 'connection'] })
  type!: 'self' | 'connection';

  @ApiProperty({ example: 'John Doe' })
  displayName!: string;

  @ApiProperty({ enum: UserRoleEnum })
  role!: UserRoleEnum;

  @ApiProperty({ example: 'Acme Corp', required: false })
  affiliation?: string;

  @ApiProperty({ example: true })
  isConnected!: boolean;
}

export class GraphEdgeDto {
  @ApiProperty({ example: 'edge-123' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  source!: string;

  @ApiProperty({ example: 'user-456' })
  target!: string;

  @ApiProperty({ enum: ['connection', 'match', 'interaction'] })
  edgeType!: 'connection' | 'match' | 'interaction';

  @ApiProperty({ example: 0.85, required: false })
  weight?: number;

  @ApiProperty({
    example: ['mutual connection', 'same event'],
    required: false,
  })
  reasons?: string[];

  @ApiProperty({ example: 2, required: false })
  count?: number;
}

export class GraphResponseDto {
  @ApiProperty({ type: [GraphNodeDto] })
  nodes!: GraphNodeDto[];

  @ApiProperty({ type: [GraphEdgeDto] })
  edges!: GraphEdgeDto[];
}
