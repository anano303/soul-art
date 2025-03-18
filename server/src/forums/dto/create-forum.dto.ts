import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsString } from "class-validator";

export class CreateForumDto {

  @ApiProperty({
    example: 'some fishing and hunting content'
  })
  @IsNotEmpty()
  @IsString()
  content: string
  
  @ApiProperty({
    example: ['Fishing', 'Hunting']
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  tags: string[]
  

}