import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SalesManagerRegisterDto {
  @ApiProperty({
    example: 'John Doe',
    minLength: 4,
    maxLength: 50,
  })
  @IsString()
  @MinLength(4, { message: 'სახელი ძალიან მოკლეა.' })
  @MaxLength(50, { message: 'სახელი ძალიან გრძელია.' })
  name!: string;

  @ApiProperty({
    example: 'john@example.com',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: 'ელ-ფოსტა არასწორია.' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 5,
    maxLength: 20,
  })
  @IsString()
  @MinLength(5, { message: 'პაროლი ძალიან მოკლეა.' })
  @MaxLength(20, { message: 'პაროლი ძალიან გრძელია.' })
  password!: string;

  @ApiProperty({
    example: '+995599123456',
    description: 'ტელეფონის ნომერი',
  })
  @IsString()
  @MinLength(9, { message: 'ტელეფონის ნომერი ძალიან მოკლეა.' })
  phone!: string;

  @ApiProperty({
    example: 'GE29TB7894545082100003',
    description: 'საბანკო ანგარიშის ნომერი (IBAN)',
  })
  @IsString()
  @Matches(/^GE\d{2}[A-Z]{2}\d{16}$/, {
    message: 'საბანკო ანგარიშის ფორმატი არასწორია. გამოიყენეთ ქართული IBAN.',
  })
  bankAccount!: string;

  @ApiProperty({
    example: 'თიბისი ბანკი',
    description: 'ბანკის სახელი',
  })
  @IsString()
  bankName!: string;

  @ApiProperty({
    example: '01234567890',
    description: 'პირადი ნომერი',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'პირადი ნომერი უნდა შეიცავდეს ზუსტად 11 ციფრს.',
  })
  personalId!: string;
}
