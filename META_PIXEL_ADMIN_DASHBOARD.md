# Meta Pixel Admin Dashboard - დაყენების ინსტრუქცია

## რა შეიქმნა

თქვენი მოთხოვნის შესაბამისად, შეიქმნა **Meta Pixel Analytics Dashboard** რომელიც ხელმისაწვდომია **მხოლოდ ადმინისთვის**.

## შექმნილი ფაილები

### 1. Admin Page

**ფაილი:** `web/src/app/(pages)/admin/meta-pixel/page.tsx`

- ადმინ პანელის ახალი გვერდი Meta Pixel-ის ინფორმაციისთვის
- ავტორიზაციის შემოწმება (მხოლოდ Admin-ს შეუძლია წვდომა)
- თუ მომხმარებელი არ არის ადმინი, გადამისამართდება /admin-ზე

### 2. Dashboard Component

**ფაილი:** `web/src/modules/admin/components/meta-pixel-dashboard.tsx`

- დეტალური Meta Pixel ინფორმაციის ჩვენება
- ყველა კონფიგურაცია .env.local ფაილიდან
- ინტერაქტიული UI კომპონენტები

### 3. Dashboard Styles

**ფაილი:** `web/src/modules/admin/components/meta-pixel-dashboard.css`

- თანამედროვე, responsive დიზაინი
- ანიმაციები და ჰოვერ ეფექტები
- მობილური მოწყობილობებისთვის ოპტიმიზებული

### 4. Navigation Update

**ფაილი:** `web/src/components/header/user-menu.tsx`

- დამატებულია "Meta Pixel" ლინკი ადმინის მენიუში
- ხელმისაწვდომია მხოლოდ Role.Admin-ის მქონე მომხმარებლებისთვის

## რას აჩვენებს Dashboard

### 📊 Pixel Information Card

ყველა მთავარი ინფორმაცია:

- **Dataset ID**: 1189697243076610
- **Pixel ID**: 1189697243076610
- **Facebook App ID**: 2385644865136914
- **Facebook Page ID**: 542501458957000
- **Access Token**: EAAQHWdqgWZCsB... (სრული ტოკენი Copy ღილაკით)
- **Owner**: Ani Beroshvili
- **შექმნის თარიღი**: 9 ოქტ. 2025
- **სტატუსი**: ჩართულია
- **Owner Business**: SoulArt (ID: 1019356016247125)

### ✨ Features (პარამეტრები)

1. **First-party Cookies** - ჩართულია
2. **Automatic Advanced Matching** - ჩართულია
3. **Core Setup** - გამორთული
4. **Track Events Automatically** - გამორთული

### 📈 Tracked Events (თვალყური მდევნებული ივენთები)

- PageView - გვერდის ნახვები
- ViewContent - პროდუქტის ნახვა
- AddToCart - კალათაში დამატება
- InitiateCheckout - შეკვეთის დაწყება
- Purchase - შესყიდვა
- Search - ძიება

### ⚙️ დამატებითი პარამეტრები

- Conversions API - გააქტიურების ღილაკი
- Extend Attribution Uploads - ჩართულია
- Auto Tracking - ჩართულია
- Traffic Permissions - კონფიგურაციის ღილაკი

### 🔗 სასარგებლო ბმულები

პირდაპირი ბმულები Facebook-ის:

- Events Manager
- Test Events
- Diagnostics
- Business Settings

## როგორ გამოვიყენო

### 1. გახსენით Admin Panel

- შედით საიტზე როგორც Admin
- გახსენით User Menu (პროფილის ხატულა)
- ადმინ პანელის სექციაში იხილავთ "Meta Pixel" ლინკს

### 2. ან პირდაპირ URL

```
http://localhost:3000/admin/meta-pixel
```

### 3. უსაფრთხოება

- ✅ მხოლოდ Role.Admin-ს შეუძლია წვდომა
- ✅ Seller-ებს და სხვა როლებს არ ეძლევათ წვდომა
- ✅ უავტორიზებელი მომხმარებლები გადამისამართდებიან login-ზე

## Dashboard Features

### 📋 Copy Functionality

ყველა ID და Token-ის გასწვრივ არის Copy ღილაკი:

- დააჭირეთ Copy ღილაკს
- ტექსტი დაკოპირდება clipboard-ში
- გამოჩნდება ✓ ნიშანი დასტურისთვის

### 🔄 Refresh Button

- განაახლებს გვერდს
- ანიმაციით ვიზუალური feedback

### 🔗 Facebook Events Manager

- პირდაპირი ბმული Facebook-ის Events Manager-ზე
- გაიხსნება ახალ ტაბში

## მომავალში გასაუმჯობესებელი

### Real-time მონაცემები (სურვილის შემთხვევაში)

თქვენ შეგიძლიათ მომავალში დაამატოთ:

1. **Facebook Graph API ინტეგრაცია**

   ```typescript
   // Get real pixel statistics
   const response = await fetch(
     `https://graph.facebook.com/v18.0/${pixelId}/stats?access_token=${accessToken}`
   );
   ```

2. **Live Event Tracking**

   - რეალურ დროში ივენთების მონიტორინგი
   - ივენთების რაოდენობა დღეების მიხედვით

3. **Performance Metrics**
   - Event Match Rate
   - Conversion Rate
   - Attribution Success Rate

## Troubleshooting

### თუ გვერდი არ იხსნება

1. დარწმუნდით რომ თქვენ ხართ Admin (Role.Admin)
2. შეამოწმეთ .env.local ფაილში ყველა პარამეტრი არსებობს
3. გაუშვით `npm run dev` და შეამოწმეთ console errors

### თუ ინფორმაცია არ ჩანს

1. შეამოწმეთ .env.local ფაილი
2. დარწმუნდით რომ ყველა NEXT*PUBLIC*\* ცვლადი სწორად არის დაყენებული
3. გადატვირთეთ development server

## ტექნიკური დეტალები

### გამოყენებული ტექნოლოგიები

- Next.js 15 (App Router)
- TypeScript
- Lucide React Icons
- CSS Modules
- Client-side რენდერინგი

### Responsive Design

- Desktop ✓
- Tablet ✓
- Mobile ✓

### Browser Support

- Chrome ✓
- Firefox ✓
- Safari ✓
- Edge ✓

## შენიშვნები

⚠️ **Access Token უსაფრთხოება**
Access Token ფრთხილად მოიხმარეთ:

- არ გაზიაროთ სხვებთან
- რეგულარულად განაახლეთ
- გამოიყენეთ Environment Variables

✨ **Design Consistency**
Dashboard დიზაინი შესაბამისობაშია თქვენი არსებული admin panel-ის სტილთან (banner-list.css, products-list.css და სხვა).

🎯 **მხოლოდ ადმინისთვის**
როგორც მოითხოვეთ, ეს გვერდი ხელმისაწვდომია **მხოლოდ და მხოლოდ ადმინისთვის**.
