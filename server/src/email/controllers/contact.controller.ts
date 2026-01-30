import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { EmailService } from '../services/email.services';
import { ContactFormDto } from '../dto/contact-form.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sendContactForm(@Body() contactFormDto: ContactFormDto) {
    try {
      await this.emailService.sendContactFormEmail({
        name: contactFormDto.name,
        email: contactFormDto.email,
        subject: contactFormDto.subject,
        message: contactFormDto.message,
      });

      return {
        success: true,
        message: 'შეტყობინება წარმატებით გაიგზავნა',
      };
    } catch (error) {
      console.error('Contact form email error:', error);
      return {
        success: false,
        message:
          'შეტყობინების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით.',
      };
    }
  }
}
