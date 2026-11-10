import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SpeakInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  text: string;

  @IsString()
  @IsOptional()
  voiceId?: string;
}
