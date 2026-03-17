import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @MaxLength(500)
  questionKa: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  questionEn?: string;

  @IsString()
  @MaxLength(5000)
  answerKa: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answerEn?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
