import { IsNotEmpty, IsString } from 'class-validator';

export class SelectOfferDto {
  // The _id of the chosen embedded offer.
  @IsString()
  @IsNotEmpty()
  offerId!: string;
}
