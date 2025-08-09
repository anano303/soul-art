# SoulArt - Balance & Payment System

## სისტემის აღწერა

სელერების balance და payment სისტემა, რომელიც ავტომატურად განაწილებს და გადაურიცხავს თანხას სელერებს BOG-ის API-ით.

## ფუნქციონალი

### 🏦 Balance Management

- **ავტომატური ბალანსის გამოთვლა**: როდესაც შეკვეთა მიტანილია (`delivered` status)
- **კომისიების გამოქვითვა**:
  - საიტის კომისიო: 10%
  - მიტანის კომისიო: 5% (მინიმუმ 10 ლარი) თუ SoulArt-ის მიტანაა
- **ბალანსის ისტორია**: თითოეული ტრანზაქციის დეტალური რეკორდი

### 💳 Bank Integration

- **BOG Bank API**: ნამდვილი ბანკის ინტეგრაცია ავტომატური გადარიცხვებისთვის
- **ავტომატური Withdrawals**: სელერი ვერ მიიღებს თანხას 15 ლარზე ნაკლები თუ არის
- **Account Validation**: ანგარიშის ნომრის ვალიდაცია BOG API-ით

### 📧 Email Notifications

- **შეკვეთის დადასტურება**: მყიდველისთვის და სელერისთვის
- **მიტანის დადასტურება**: მყიდველისთვის
- **Balance Withdrawal**: გადარიცხვის შეტყობინება

---

## ტექნიკური დეტალები

### Backend Architecture

#### 1. Database Schemas

**SellerBalance Schema** (`server/src/users/schemas/seller-balance.schema.ts`)

```typescript
{
  sellerId: ObjectId,          // სელერის ID
  availableBalance: Number,    // ხელმისაწვდომი ბალანსი
  totalEarnings: Number,       // ჯამური შემოსავალი
  totalWithdrawn: Number,      // ჯამური გადარიცხული
  accountNumber: String,       // ბანკის ანგარიში
  lastUpdated: Date
}
```

**BalanceTransaction Schema**

```typescript
{
  sellerId: ObjectId,
  orderId: ObjectId,
  type: 'earning' | 'withdrawal',
  amount: Number,
  commission: Number,
  description: String,
  transactionId: String,       // BOG ტრანზაქციის ID
  status: 'pending' | 'completed' | 'failed'
}
```

#### 2. Services

**BalanceService** (`server/src/users/services/balance.service.ts`)

- `processOrderEarnings()`: შეკვეთის earning-ის დამუშავება
- `requestWithdrawal()`: withdrawal request-ის მუშავება
- `getSellerBalance()`: სელერის ბალანსის მოძიება

**BankIntegrationService** (`server/src/users/services/bog-bank-integration.service.ts`)

- `transferToSeller()`: BOG API-ით გადარიცხვა
- `validateAccount()`: ანგარიშის ვალიდაცია

**EmailService** (`server/src/email/services/email.services.ts`)

- `sendOrderConfirmation()`: შეკვეთის დადასტურება
- `sendNewOrderNotificationToSeller()`: სელერისთვის ახალი შეკვეთა
- `sendDeliveryConfirmation()`: მიტანის დადასტურება
- `sendWithdrawalNotification()`: withdrawal შეტყობინება

#### 3. API Endpoints

**Balance Controller** (`/api/balance`)

```
GET    /balance/seller/:sellerId     - სელერის ბალანსი
POST   /balance/withdrawal           - withdrawal request
GET    /balance/transactions/:sellerId - ტრანზაქციების ისტორია
GET    /balance/admin/all            - ყველა სელერის ბალანსი (admin)
```

### Frontend Components

#### 1. Seller Balance Dashboard

**მისამართი**: `/profile/balance`
**ფაილი**: `web/src/app/profile/balance/page.tsx`

**ფუნქციონალი**:

- ბალანსის ჩვენება (ხელმისაწვდომი/ჯამური/გადარიცხული)
- Withdrawal Form (15 ლარის მინიმუმით)
- ტრანზაქციების ისტორია
- BOG ანგარიშის მართვა

#### 2. Admin Balances Page

**მისამართი**: `/admin/balances`
**ფაილი**: `web/src/app/admin/balances/page.tsx`

**ფუნქციონალი**:

- ყველა სელერის ბალანსი
- სელერების შემოსავლების შეჯამება
- ტრანზაქციების მონიტორინგი

### Navigation

- **Seller Menu**: "ჩემი ბალანსი" ლინკი user menu-ში
- **Admin Menu**: "Balance Management" ლინკი admin menu-ში

---

## კონფიგურაცია

### Environment Variables

#### Backend (.env)

```bash
# BOG Bank API
BOG_CLIENT_ID=your_bog_client_id
BOG_CLIENT_SECRET=your_bog_client_secret
BOG_API_URL=https://api.bog.ge
BOG_ENVIRONMENT=production  # ან development

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@soulart.ge

# Database
MONGODB_URI=your_mongodb_connection_string
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### BOG Bank API Setup

1. **BOG Developer Portal-ზე რეგისტრაცია**
2. **API Credentials-ის მიღება** (CLIENT_ID, CLIENT_SECRET)
3. **Webhook URLs-ის კონფიგურაცია** (transaction confirmations)
4. **Production Environment-ში გადატანა**

---

## Workflow

### 1. შეკვეთის მიღება

1. მყიდველი ფადირებს შეკვეთას
2. `OrdersService.payOrder()` იგზავნება
3. Email notification-ები:
   - მყიდველისთვის: შეკვეთის დადასტურება
   - სელერისთვის: ახალი შეკვეთის შეტყობინება

### 2. მიტანის დადასტურება

1. ადმინი ან კურიერი აღნიშნავს `delivered` status
2. `OrdersService.updateDelivered()` იგზავნება
3. `BalanceService.processOrderEarnings()` - earning-ის გამოთვლა:
   ```typescript
   const siteCommission = productPrice * 0.1; // 10%
   const deliveryCommission = isOwnDelivery
     ? Math.max(productPrice * 0.05, 10)
     : 0;
   const sellerEarning = productPrice - siteCommission - deliveryCommission;
   ```
4. Email: მყიდველისთვის მიტანის დადასტურება

### 3. Withdrawal Process

1. სელერი ითხოვს withdrawal (მინიმუმ 15 ლარი)
2. `BalanceService.requestWithdrawal()`:
   - ბალანსის შემოწმება
   - BOG API-ით გადარიცხვა
   - Transaction record-ის შექმნა
3. Email notifications:
   - სელერისთვის: წარმატებული გადარიცხვა
   - ადმინისთვის: გადარიცხვის შეტყობინება

---

## Testing

### Backend Testing

```bash
cd server
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report
```

### მნიშვნელოვანი Test Cases

1. **Balance Calculation**: კომისიების სწორი გამოთვლა
2. **BOG API Integration**: ბანკის API-ის მუშაობა
3. **Email Notifications**: ყველა email template-ის ტესტირება
4. **Error Handling**: ქსელის შეფერხებები, API failures
5. **Security**: Role-based access control

---

## Production Deployment

### Backend

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

### Frontend

```bash
# Build
npm run build

# Deploy (Vercel example)
vercel --prod
```

### Database Migration

```bash
# მონაცემთა ბაზის migration (თუ საჭიროა)
npm run migration:up
```

---

## მონიტორინგი

### Logs

- **Balance Transactions**: ყველა financial transaction
- **BOG API Calls**: ბანკის API-ის request/response logs
- **Email Delivery**: Email გაგზავნების logs
- **Error Tracking**: Production errors (Sentry რეკომენდირებულია)

### Metrics

- სელერების საშუალო შემოსავალი
- withdrawal-ების სიხშირე
- BOG API success rate
- Email delivery rate

---

## Support

### Admin Functions

- ბალანსების მანუალური კორექტირება
- withdrawal-ების manual processing
- ტრანზაქციების refund/cancel

### Debug Tools

- Balance recalculation scripts
- Email notification resend
- BOG API status checker

---

## უსაფრთხოება

### Data Protection

- სელერების ბანკის მონაცემები encrypted
- API tokens secure storage-ში
- User roles და permissions

### Financial Security

- Double-entry accounting system
- Transaction audit trails
- Rate limiting BOG API calls
- Withdrawal amount limits

---

## მომავალი Features

### Short Term

- SMS notifications withdrawal-ებისთვის
- Balance dashboard analytics
- Automated tax reporting

### Long Term

- Multiple bank integration (TBC, Liberty)
- Cryptocurrency payments
- Advanced reporting tools
- Mobile app notifications

---

**Contact**: admin@soulart.ge  
**Last Updated**: August 9, 2025  
**Version**: 1.0.0
