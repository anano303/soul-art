import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional } from 'class-validator';

export class WebhookVerificationDto {
  @ApiProperty()
  @IsString()
  'hub.mode': string;

  @ApiProperty()
  @IsString()
  'hub.verify_token': string;

  @ApiProperty()
  @IsString()
  'hub.challenge': string;
}

class MessageDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  mid?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

class PostbackDto {
  @ApiProperty()
  @IsString()
  payload: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  title?: string;
}

class SenderDto {
  @ApiProperty()
  @IsString()
  id: string;
}

class RecipientDto {
  @ApiProperty()
  @IsString()
  id: string;
}

class MessagingDto {
  @ApiProperty()
  @IsObject()
  sender: SenderDto;

  @ApiProperty()
  @IsObject()
  recipient: RecipientDto;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  message?: MessageDto;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  postback?: PostbackDto;

  @ApiProperty()
  @IsString()
  @IsOptional()
  timestamp?: string;
}

class EntryDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  time: string;

  @ApiProperty({ type: [MessagingDto] })
  @IsArray()
  messaging: MessagingDto[];
}

export class WebhookEventDto {
  @ApiProperty()
  @IsString()
  object: string;

  @ApiProperty({ type: [EntryDto] })
  @IsArray()
  entry: EntryDto[];
}
