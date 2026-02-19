import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingCountriesController } from './shipping-countries.controller';
import { ShippingCountriesService } from './shipping-countries.service';
import { ShippingCountry, ShippingCountrySchema } from './schemas/shipping-country.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShippingCountry.name, schema: ShippingCountrySchema },
    ]),
  ],
  controllers: [ShippingCountriesController],
  providers: [ShippingCountriesService],
  exports: [ShippingCountriesService],
})
export class ShippingCountriesModule {}
