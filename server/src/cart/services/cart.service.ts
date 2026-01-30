import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { ProductsService } from '@/products/services/products.service';
// import { CartItem, ShippingDetails } from '../../interfaces';
import { UserDocument } from '@/users/schemas/user.schema';
import { CartItem } from '@/types/cart';
import { ShippingDetails } from '@/types/shipping';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
  ) {}

  async getCart(user: UserDocument): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId: user._id });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: user._id,
        items: [],
      });
    }
    const productIds = cart.items.map((item) => item.productId);
    const products = await this.productsService.findByIds(productIds);
    cart.items = cart.items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString(),
      );
      if (product) {
        item.qty = Math.min(item.qty, product.countInStock);
        item.countInStock =
          product.variants.find(
            (v) =>
              v.size === item.size &&
              v.color === item.color &&
              v.ageGroup === item.ageGroup,
          )?.stock || product.countInStock;
      }
      return item;
    });

    return cart;
  }

  private calculatePrices(cart: CartDocument) {
    cart.itemsPrice = cart.items.reduce(
      (acc, item) => acc + item.price * item.qty,
      0,
    );
    cart.taxPrice = Number((0.02 * cart.itemsPrice).toFixed(2));
    cart.shippingPrice = cart.itemsPrice > 100 ? 0 : 0;
    cart.totalPrice = cart.itemsPrice + cart.taxPrice + cart.shippingPrice;
    return cart;
  }

  async addItemToCart(
    userId: string,
    productId: string,
    qty: number,
  ): Promise<CartDocument> {
    const product = await this.productsService.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    let cart = await this.cartModel.findOne({ user: userId });

    if (!cart) {
      cart = await this.cartModel.create({
        user: userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (existingItem) {
      existingItem.qty = qty;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        nameEn: product.nameEn, // Include nameEn
        image: product.images[0],
        price: product.price,
        countInStock: product.countInStock,
        qty,
      });
    }

    this.calculatePrices(cart);
    return await cart.save();
  }

  async addCartItem(
    productId: string,
    qty: number,
    user: UserDocument,
    size?: string,
    color?: string,
    ageGroup?: string,
    price?: number,
    referralInfo?: {
      originalPrice?: number;
      hasReferralDiscount?: boolean;
      referralDiscountPercent?: number;
      referralDiscountAmount?: number;
    },
  ): Promise<CartDocument> {
    const product = await this.productsService.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    // Check if product is in stock
    let availableStock = 0;
    if (size || color || ageGroup) {
      // Check variant stock
      const variant = product.variants?.find(
        (v) => v.size === size && v.color === color && v.ageGroup === ageGroup,
      );
      availableStock = variant?.stock ?? 0;
    } else if (product.variants && product.variants.length > 0) {
      // Sum all variant stocks
      availableStock = product.variants.reduce(
        (sum, v) => sum + (v.stock ?? 0),
        0,
      );
    } else {
      availableStock = product.countInStock ?? 0;
    }

    if (availableStock <= 0) {
      throw new BadRequestException(
        'პროდუქტი გაყიდულია / Product is out of stock',
      );
    }

    if (qty > availableStock) {
      throw new BadRequestException(
        `მარაგში დარჩენილია მხოლოდ ${availableStock} ცალი`,
      );
    }

    const cart = await this.getCart(user);

    // Check if we have this exact variant in the cart
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color &&
        item.ageGroup === ageGroup,
    );

    if (existingItem) {
      existingItem.qty = qty;
      // Update price if provided (to handle discount changes)
      if (price !== undefined) {
        existingItem.price = price;
      }
      // Update referral info if provided
      if (referralInfo) {
        existingItem.originalPrice = referralInfo.originalPrice;
        existingItem.hasReferralDiscount = referralInfo.hasReferralDiscount;
        existingItem.referralDiscountPercent =
          referralInfo.referralDiscountPercent;
        existingItem.referralDiscountAmount =
          referralInfo.referralDiscountAmount;
      }
    } else {
      const cartItem: CartItem = {
        productId: product._id.toString(),
        name: product.name,
        nameEn: product.nameEn,
        image: product.images[0],
        price: price ?? product.price, // Use provided price (discounted) or fallback to product price
        originalPrice: referralInfo?.originalPrice ?? product.price,
        countInStock:
          product.variants?.find(
            (v) =>
              v.size === size && v.color === color && v.ageGroup === ageGroup,
          )?.stock || product.countInStock,
        qty,
        size,
        color,
        ageGroup,
        hasReferralDiscount: referralInfo?.hasReferralDiscount,
        referralDiscountPercent: referralInfo?.referralDiscountPercent,
        referralDiscountAmount: referralInfo?.referralDiscountAmount,
      };
      cart.items.push(cartItem);
    }

    this.calculatePrices(cart);
    return cart.save();
  }

  async removeCartItem(
    productId: string,
    user: UserDocument,
    size?: string,
    color?: string,
    ageGroup?: string,
  ): Promise<CartDocument> {
    const cart = await this.getCart(user);

    // Filter items to remove the specific variant
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          (!size || item.size === size) &&
          (!color || item.color === color) &&
          (!ageGroup || item.ageGroup === ageGroup)
        ),
    );

    this.calculatePrices(cart);
    return cart.save();
  }

  async updateCartItemQty(
    productId: string,
    qty: number,
    user: UserDocument,
    size?: string,
    color?: string,
  ): Promise<CartDocument> {
    const cart = await this.getCart(user);
    const item = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color,
    );

    if (!item) throw new NotFoundException('Item not found in cart');

    // For products with variants, we need to check stock differently
    const product = await this.productsService.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    // Check stock for variant
    if (size && color && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(
        (v) => v.size === size && v.color === color,
      );
      if (!variant) throw new NotFoundException('Variant not found');
      if (qty > variant.stock)
        throw new BadRequestException('Not enough stock for this variant');
    } else {
      // Fall back to general stock check
      if (qty > item.countInStock)
        throw new BadRequestException('Not enough stock');
    }

    item.qty = qty;
    this.calculatePrices(cart);
    return cart.save();
  }

  async clearCart(user: UserDocument): Promise<CartDocument> {
    const cart = await this.getCart(user);
    cart.items = [];
    this.calculatePrices(cart);
    return cart.save();
  }

  validateShippingDetails(shippingDetails: ShippingDetails): ShippingDetails {
    const { address, city, country, phoneNumber } = shippingDetails;

    if (!address || !city || !country || !phoneNumber) {
      throw new BadRequestException(
        'Address, city, country and phone are required',
      );
    }
    return shippingDetails;
  }

  validatePaymentMethod(paymentMethod: string): string {
    const validMethods = ['PayPal', 'Stripe', 'BOG'];

    if (!validMethods.includes(paymentMethod)) {
      throw new BadRequestException('Invalid payment method');
    }

    return paymentMethod;
  }

  async validateCartItems(user: UserDocument) {
    const cart = await this.getCart(user);
    const unavailableItems = [];
    let isValid = true;

    // Get all product details
    const productIds = cart.items.map((item) => item.productId);
    const products = await this.productsService.findByIds(productIds);

    for (const item of cart.items) {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString(),
      );

      if (!product) {
        // Product no longer exists
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'not_found',
        });
        continue;
      }

      let availableStock = product.countInStock;

      // Check variant stock if applicable
      if (
        item.size &&
        item.color &&
        product.variants &&
        product.variants.length > 0
      ) {
        const variant = product.variants.find(
          (v) =>
            v.size === item.size &&
            v.color === item.color &&
            v.ageGroup === item.ageGroup,
        );

        if (variant) {
          availableStock = variant.stock;
        }
      }

      // Check stock availability
      if (availableStock <= 0) {
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'out_of_stock',
        });
      } else if (item.qty > availableStock) {
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'insufficient_stock',
          availableQuantity: availableStock,
        });
      }
    }

    return {
      isValid,
      unavailableItems,
      message: isValid
        ? 'All items are available'
        : 'Some items are unavailable',
    };
  }

  async validateGuestCartItems(items: any[]) {
    const unavailableItems = [];
    let isValid = true;

    // Get all product details
    const productIds = items.map((item) => item.productId);
    const products = await this.productsService.findByIds(productIds);

    for (const item of items) {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString(),
      );

      if (!product) {
        // Product no longer exists
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'not_found',
        });
        continue;
      }

      let availableStock = product.countInStock;

      // Check variant stock if applicable
      if (
        item.size &&
        item.color &&
        product.variants &&
        product.variants.length > 0
      ) {
        const variant = product.variants.find(
          (v) =>
            v.size === item.size &&
            v.color === item.color &&
            v.ageGroup === item.ageGroup,
        );

        if (variant) {
          availableStock = variant.stock;
        }
      }

      // Check stock availability
      if (availableStock <= 0) {
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'out_of_stock',
        });
      } else if (item.quantity > availableStock) {
        isValid = false;
        unavailableItems.push({
          productId: item.productId,
          reason: 'insufficient_stock',
          availableQuantity: availableStock,
        });
      }
    }

    return {
      isValid,
      unavailableItems,
      message: isValid
        ? 'All items are available'
        : 'Some items are unavailable',
    };
  }
}
