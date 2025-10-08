# Meta Pixel ID Configuration

## 📍 სად არის ჩაწერილი თქვენი Pixel ID

თქვენი **Meta Pixel ID: `1189697243076610`** ინახება რამდენიმე ადგილას:

### 1️⃣ Environment Variable (რეკომენდებული)

**ფაილი:** `web/.env.local`

```bash
NEXT_PUBLIC_META_PIXEL_ID=1189697243076610
```

✅ **უპირატესობები:**

- მარტივად შეცვლა production/development-ში
- არ უნდა hardcode-ში წეროთ
- უსაფრთხო და ორგანიზებული

### 2️⃣ Layout Component

**ფაილი:** `web/src/app/layout.tsx`

```typescript
fbq("init", '${process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610"}');
```

### 3️⃣ MetaPixel Component

**ფაილი:** `web/src/components/MetaPixel.tsx`

```typescript
export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610";
```

## 🔄 როგორ შევცვალოთ Pixel ID

თუ მომავალში გინდა სხვა Pixel ID-ს გამოყენება:

### 1. შეცვალეთ `.env.local` ფაილში:

```bash
NEXT_PUBLIC_META_PIXEL_ID=თქვენი_ახალი_ID
```

### 2. გადატვირთეთ development server:

```bash
npm run dev
```

ყველა ადგილას ავტომატურად განახლდება! ✅

## 🌍 Production vs Development

### Development (.env.local):

```bash
NEXT_PUBLIC_META_PIXEL_ID=1189697243076610  # Test Pixel
```

### Production (Vercel/Server):

Environment Variables-ში დაამატეთ:

```bash
NEXT_PUBLIC_META_PIXEL_ID=1189697243076610  # Production Pixel
```

## 🔍 როგორ შევამოწმოთ

### Browser Console-ში:

```javascript
console.log(window.fbq); // უნდა აჩვენოს function
console.log(process.env.NEXT_PUBLIC_META_PIXEL_ID); // undefined (client-side security)
```

### Facebook Events Manager:

1. გადადით: https://business.facebook.com/events_manager2
2. აირჩიეთ Pixel: `1189697243076610`
3. Test Events → რეალურ დროში ნახეთ ივენთები

### Chrome Extension:

1. დააინსტალირეთ: "Facebook Pixel Helper"
2. გახსენით თქვენი საიტი
3. Extension აჩვენებს: ✅ Pixel Active

## 📦 Fallback Value

კოდში ყოველთვის არის fallback:

```typescript
process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610";
```

ესეიგი თუ რაიმე მიზეზით `.env.local` არ იკითხება, მაინც იმუშავებს hardcoded ID-თი.

## ⚠️ Security Note

**`NEXT_PUBLIC_` prefix** ნიშნავს რომ ეს variable **public** არის და client-side-ზე ხელმისაწვდომია. ეს ნორმალურია Meta Pixel-ისთვის, რადგან ეს არის საჯარო tracking code.

## 🚀 Production Deployment

**Vercel-ზე:**

1. Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_META_PIXEL_ID` = `1189697243076610`
3. Redeploy

**DigitalOcean App Platform-ზე:**

1. App Settings → Environment Variables
2. Add: `NEXT_PUBLIC_META_PIXEL_ID` = `1189697243076610`
3. Redeploy

## ✅ კონფიგურაცია დასრულებულია!

თქვენი Pixel ID უკვე:

- ✅ დამატებულია `.env.local`-ში
- ✅ გამოიყენება `layout.tsx`-ში
- ✅ გამოიყენება `MetaPixel.tsx`-ში
- ✅ არის fallback value-ც უსაფრთხოებისთვის

**არაფერი აღარ საჭიროა!** უბრალოდ:

```bash
npm run dev
```

და გადაამოწმეთ Browser Console-ში: `window.fbq` ✅
