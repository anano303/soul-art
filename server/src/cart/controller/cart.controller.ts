import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { CartService } from '../services/cart.service';
import { AddToCartDto } from '../dtos/add-to-cart.dto';
import { SaveShippingDetailsDto } from '../dtos/save-shipping-details.dto';
import { SavePaymentMethodDto } from '../dtos/save-payment-method.dto';
import { UserDocument } from '../../users/schemas/user.schema';

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getCart(@CurrentUser() user: UserDocument) {
    return this.cartService.getCart(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('items')
  addToCart(
    @Body()
    {
      productId,
      qty,
      size,
      color,
      ageGroup,
      price,
      originalPrice,
      hasReferralDiscount,
      referralDiscountPercent,
      referralDiscountAmount,
    }: AddToCartDto,
    @CurrentUser() user: UserDocument,
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }
    return this.cartService.addCartItem(
      productId,
      qty,
      user,
      size,
      color,
      ageGroup,
      price,
      {
        originalPrice,
        hasReferralDiscount,
        referralDiscountPercent,
        referralDiscountAmount,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('items/:productId')
  updateCartItem(
    @Param('productId') productId: string,
    @Body()
    { qty, size, color }: { qty: number; size?: string; color?: string },
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.updateCartItemQty(
      productId,
      qty,
      user,
      size,
      color,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:productId')
  removeFromCart(
    @Param('productId') productId: string,
    @Body()
    {
      size,
      color,
      ageGroup,
    }: { size?: string; color?: string; ageGroup?: string },
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.removeCartItem(
      productId,
      user,
      size,
      color,
      ageGroup,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('shipping')
  saveShipping(
    @Body() shippingDetails: SaveShippingDetailsDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.validateShippingDetails(shippingDetails);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payment')
  savePaymentMethod(
    @Body() { paymentMethod }: SavePaymentMethodDto,
    @CurrentUser() user: UserDocument,
  ) {
    console.log('Cart controller received payment method:', paymentMethod);
    console.log('Full request body:', { paymentMethod });
    return this.cartService.validatePaymentMethod(paymentMethod);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  clearCart(@CurrentUser() user: UserDocument) {
    return this.cartService.clearCart(user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('validate')
  async validateCart(
    @Body() body: { items?: any[] },
    @CurrentUser() user?: UserDocument,
  ) {
    // For authenticated users, validate their cart
    if (user) {
      return this.cartService.validateCartItems(user);
    }

    // For guest users, validate the items they send
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException(
        'Items array is required for guest validation',
      );
    }

    return this.cartService.validateGuestCartItems(body.items);
  }
}
