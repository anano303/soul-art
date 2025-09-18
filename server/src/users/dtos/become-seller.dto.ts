import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BecomeSellerDto {
  @ApiProperty({
    example: 'ციფრული სამყარო',
    description: 'მაღაზიის სახელი',
  })
  @IsNotEmpty()
  @IsString()
  storeName: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'მაღაზიის ლოგოს ფაილი',
    required: false,
  })
  @IsOptional()
  logoFile?: Express.Multer.File;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'მაღაზიის ლოგოს URL მისამართი',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeLogo?: string;

  @ApiProperty({
    example: '+995555123456',
    description: 'ტელეფონის ნომერი საერთაშორისო ფორმატში (თუ არ აქვს)',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({
    example: '01024085800',
    description: 'პირადი ნომერი',
  })
  @IsNotEmpty()
  @IsString()
  identificationNumber: string;

  @ApiProperty({
    example: 'GE29TB7777777777777777',
    description: 'საბანკო ანგარიშის ნომერი IBAN ფორმატში',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({
    example: 'ABC12345',
    description: 'რეფერალური კოდი (არაუცილებელო)',
    required: false,
  })
  @IsOptional()
  @IsString()
  invitationCode?: string;
}
