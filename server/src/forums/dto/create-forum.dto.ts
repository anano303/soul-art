import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateForumDto {
  @ApiProperty({
    example: 'some painting and artists content',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    example: [
      'პეიზაჟი',
      'პორტრეტი',
      'აბსტრაქცია',
      'შავ-თეთრი',
      'ანიმაციური',
      'ციფრული ილუსტრაციები',
      'სხვა',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  tags: string[];
}
