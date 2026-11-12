import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GrokSessionInput {
  @IsOptional()
  @IsIn(['assistant', 'answer-line'])
  channel?: 'assistant' | 'answer-line';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  agentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  voice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  greeting?: string;
}
