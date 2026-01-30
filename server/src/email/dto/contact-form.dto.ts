import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactFormDto {
  @IsNotEmpty({ message: 'სახელი სავალდებულოა' })
  @IsString()
  @MinLength(2, { message: 'სახელი უნდა იყოს მინიმუმ 2 სიმბოლო' })
  @MaxLength(100, { message: 'სახელი არ უნდა აღემატებოდეს 100 სიმბოლოს' })
  name: string;

  @IsNotEmpty({ message: 'ელ-ფოსტა სავალდებულოა' })
  @IsEmail({}, { message: 'გთხოვთ შეიყვანოთ სწორი ელ-ფოსტის მისამართი' })
  email: string;

  @IsNotEmpty({ message: 'თემა სავალდებულოა' })
  @IsString()
  @MinLength(3, { message: 'თემა უნდა იყოს მინიმუმ 3 სიმბოლო' })
  @MaxLength(200, { message: 'თემა არ უნდა აღემატებოდეს 200 სიმბოლოს' })
  subject: string;

  @IsNotEmpty({ message: 'შეტყობინება სავალდებულოა' })
  @IsString()
  @MinLength(10, { message: 'შეტყობინება უნდა იყოს მინიმუმ 10 სიმბოლო' })
  @MaxLength(5000, {
    message: 'შეტყობინება არ უნდა აღემატებოდეს 5000 სიმბოლოს',
  })
  message: string;
}
