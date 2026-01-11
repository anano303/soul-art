import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
    description: 'ტელეფონის ნომერი საერთაშორისო ფორმატში',
    required: true,
  })
  @IsNotEmpty({ message: 'ტელეფონის ნომერი სავალდებულოა' })
  @Transform(({ value }) => {
    if (!value) return value;
    // Remove spaces and dashes
    let phone = value.replace(/[\s-]/g, '');
    // If starts with 5 and is 9 digits, add +995
    if (/^5\d{8}$/.test(phone)) {
      return '+995' + phone;
    }
    // If starts with 995 without +, add +
    if (/^995\d{9}$/.test(phone)) {
      return '+' + phone;
    }
    return phone;
  })
  @IsPhoneNumber(undefined, { message: 'ტელეფონის ნომერი არასწორი ფორმატისაა' })
  phoneNumber: string;

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
    example: 'BAGAGE22',
    description: 'ბანკის SWIFT/BIC კოდი',
    required: false,
  })
  @IsOptional()
  @IsString()
  beneficiaryBankCode?: string;

  @ApiProperty({
    example: 'ABC12345',
    description: 'რეფერალური კოდი (არაუცილებელო)',
    required: false,
  })
  @IsOptional()
  @IsString()
  invitationCode?: string;

  @ApiProperty({
    example: 'digital-artistry',
    description:
      'არტისტის საჯარო სლაგი (მხოლოდ პატარა ასოები, ჰიფენები და ციფრები)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Length(3, 40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Artist slug may only contain lowercase letters, numbers, and hyphens',
  })
  artistSlug?: string;
}
