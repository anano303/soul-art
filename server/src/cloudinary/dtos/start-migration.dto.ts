import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class StartMigrationDto {
  @IsString()
  @IsNotEmpty()
  cloudName: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiSecret: string;
}
