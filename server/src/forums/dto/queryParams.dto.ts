import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsNumber, IsOptional, Min } from "class-validator"


export class queryParamsDto {
  @ApiProperty({
    required: false
  })
  @Transform(({value})=> Number(value))
  @IsOptional()
  @IsNumber()
  page: number = 1
  
  @ApiProperty({
    required: false
  })
  @Transform(({value})=> Number(value))
  @IsOptional()
  @IsNumber()
  @Min(1)
  take: number = 15
}
