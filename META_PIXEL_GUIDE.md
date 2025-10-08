# Meta Pixel Integration Guide

## Overview

Meta Pixel (Facebook Pixel) არის დაყენებული და კონფიგურირებული თქვენს საიტზე.

**Pixel ID:** `1189697243076610`

## რა აკონტროლებს?

Meta Pixel აკონტროლებს:

- 📊 **ვიზიტორების რაოდენობა** - რამდენი ადამიანი ეწვია საიტს
- 🛒 **კონვერსიები** - რამდენმა შეიძინა პროდუქტი
- 🎯 **მომხმარებლის ქცევა** - რას აკეთებენ საიტზე
- 📈 **ROI (Return on Investment)** - რამდენად ეფექტურია Facebook რეკლამა
- 🔄 **Retargeting** - იმ ადამიანების დამახსოვრება რომლებიც ეწვივნენ საიტს

## ავტომატური Tracking

ეს მოვლენები **ავტომატურად** ტრეკავს:

### 1. Page Views

ყოველი გვერდის ნახვა ავტომატურად ტრეკავს როცა მომხმარებელი გვერდს ხსნის.

## მანუალური Events (დასამატებლად)

შეგიძლიათ დაამატოთ სპეციალური events თქვენს კომპონენტებში:

### Example 1: Product View Tracking

```typescript
import { trackViewContent } from "@/components/MetaPixel";

// პროდუქტის გვერდზე
useEffect(() => {
  if (product) {
    trackViewContent(product.name, product._id, product.price, "GEL");
  }
}, [product]);
```

### Example 2: Add to Cart Tracking

```typescript
import { trackAddToCart } from "@/components/MetaPixel";

const handleAddToCart = () => {
  // ... თქვენი კოდი ...

  trackAddToCart(product.name, product._id, product.price, "GEL");
};
```

### Example 3: Checkout Tracking

```typescript
import { trackInitiateCheckout } from "@/components/MetaPixel";

const handleCheckout = () => {
  trackInitiateCheckout(totalAmount, "GEL", cartItems.length);
};
```

### Example 4: Purchase Tracking

```typescript
import { trackPurchase } from "@/components/MetaPixel";

// შეკვეთის წარმატების შემდეგ
trackPurchase(order.totalAmount, "GEL", order._id);
```

### Example 5: Search Tracking

```typescript
import { trackSearch } from "@/components/MetaPixel";

const handleSearch = (query: string) => {
  trackSearch(query);
};
```

## Facebook Events Manager-ში შემოწმება

1. გადადით: https://business.facebook.com/events_manager2
2. აირჩიეთ თქვენი Pixel (ID: 1189697243076610)
3. დააჭირეთ "Test Events" რომ real-time ივენთები ნახოთ
4. გახსენით თქვენი საიტი და ნახეთ რომ ივენთები მოდის

## რა შეგიძლიათ გააკეთოთ?

### 1. Custom Audiences

შექმენით audience იმ ადამიანების, რომლებიც:

- ეწვივნენ საიტს
- ნახეს კონკრეტული პროდუქტი
- დაამატეს კალათში მაგრამ არ შეიძინეს

### 2. Conversion Tracking

თვალი ადევნეთ:

- რამდენმა ნახა პროდუქტი
- რამდენმა დაამატა კალათში
- რამდენმა შეიძინა

### 3. Retargeting Campaigns

გაუშვით რეკლამა:

- იმათთვის რომლებმაც ნახეს პროდუქტი მაგრამ არ შეიძინეს
- იმათთვის რომლებმაც დატოვეს კალათა

### 4. Lookalike Audiences

Facebook იპოვის მსგავს ადამიანებს თქვენს მყიდველებზე

## Environment Variable (Optional)

თუ გინდა Pixel ID-ს .env ფაილში შენახვა:

```bash
# .env.local
NEXT_PUBLIC_META_PIXEL_ID=1189697243076610
```

## რეკომენდაციები

✅ **რა უნდა დაამატოთ პრიორიტეტულად:**

1. `trackViewContent` - პროდუქტის დეტალების გვერდზე
2. `trackAddToCart` - კალათში დამატების ღილაკზე
3. `trackInitiateCheckout` - checkout გვერდზე
4. `trackPurchase` - შეკვეთის წარმატების შემდეგ
5. `trackSearch` - ძებნის ფუნქციაში

## Troubleshooting

### Pixel არ მუშაობს?

1. გახსენით Chrome DevTools Console
2. დაწერეთ: `window.fbq`
3. თუ არ არის undefined - Pixel დაყენებულია ✅

### Events არ ჩანს?

1. გახსენით: https://business.facebook.com/events_manager2
2. Test Events → Test browser events
3. გადმოწერეთ "Facebook Pixel Helper" Chrome extension

## Facebook Ads Manager Integration

1. შექმენით Custom Conversion:
   - Events Manager → Custom Conversions
   - აირჩიეთ სასურველი event (Purchase, AddToCart, etc.)
2. გამოიყენეთ Campaigns-ში:
   - Ads Manager → Create Campaign
   - Objective: Conversions
   - აირჩიეთ თქვენი Custom Conversion

## Privacy & GDPR

⚠️ **მნიშვნელოვანი:**

- უნდა დაამატოთ Cookie Consent banner
- მომხმარებელს უნდა ჰქონდეს არჩევანი tracking-ის მიღებაზე
- Privacy Policy-ში მიუთითეთ Meta Pixel-ის გამოყენება

## გაკეთდა ✅

- ✅ Meta Pixel Base Code დამატებულია
- ✅ PageView tracking ავტომატურად მუშაობს
- ✅ Helper functions მზადაა სხვა events-ისთვის
- ✅ TypeScript support
- ✅ Next.js App Router compatible

## შემდეგი ნაბიჯები

1. გადადით Facebook Events Manager-ში და გადაამოწმეთ Pixel
2. დაამატეთ სპეციფიკური events თქვენს კომპონენტებში
3. შექმენით Custom Audiences
4. დაიწყეთ Retargeting campaigns
