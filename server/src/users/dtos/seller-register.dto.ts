import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsPhoneNumber, 
  MinLength, 
  MaxLength, 
  IsOptional 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellerRegisterDto {
  @ApiProperty({ 
    example: 'ციფრული სამყარო',
    description: 'მაღაზიის სახელი'
  })
  @IsNotEmpty()
  @IsString()
  storeName: string;

  @ApiProperty({ 
    example: 'https://example.com/logo.png',
    description: 'მაღაზიის ლოგოს URL მისამართი',
    required: false
  })
  @IsOptional()
  @IsString()
  storeLogo?: string;

  @ApiProperty({ 
    example: 'გიორგი',
    description: 'მფლობელის სახელი'
  })
  @IsNotEmpty()
  @IsString()
  ownerFirstName: string;

  @ApiProperty({ 
    example: 'გიორგაძე',
    description: 'მფლობელის გვარი'
  })
  @IsNotEmpty()
  @IsString()
  ownerLastName: string;

  @ApiProperty({ 
    example: '+995555123456',
    description: 'ტელეფონის ნომერი საერთაშორისო ფორმატში'
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ 
    example: 'example@mail.com',
    description: 'ელ-ფოსტის მისამართი'
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'Password123!',
    description: 'პაროლი (მინიმუმ 6 და მაქსიმუმ 20 სიმბოლო)'
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს' })
  @MaxLength(20, { message: 'პაროლი არ უნდა აღემატებოდეს 20 სიმბოლოს' })
  password: string;

  @ApiProperty({ 
    example: '01024085800',
    description: 'პირადი ნომერი'
  })
  @IsNotEmpty()
  @IsString()
  identificationNumber: string;

  @ApiProperty({ 
    example: 'GE29TB7777777777777777',
    description: 'საბანკო ანგარიშის ნომერი IBAN ფორმატში'
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;
}
