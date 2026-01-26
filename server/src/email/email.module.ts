import { Module } from '@nestjs/common';
import { EmailService } from './services/email.services';
import { ContactController } from './controllers/contact.controller';

@Module({
  controllers: [ContactController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
