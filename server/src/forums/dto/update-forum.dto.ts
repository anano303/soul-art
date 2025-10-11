import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { CreateForumDto } from './create-forum.dto';

export class UpdateForumDto extends PartialType(CreateForumDto) {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  tags?: string[];
}
