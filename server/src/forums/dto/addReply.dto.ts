import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AddReplyDto {
  @ApiProperty({
    example: 'reply content for comment',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  commentId: string;
}
