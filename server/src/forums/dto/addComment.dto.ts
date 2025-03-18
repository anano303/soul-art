import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsString } from "class-validator";

export class AddCommentDto {

  @ApiProperty({
    example: 'comment for forum content'
  })
  @IsString()
  @IsNotEmpty()
  content: string

}
