# Meta Pixel Dashboard - Real-Time Event Tracking

## 🎯 რა გაკეთდა

თქვენი მოთხოვნის შესაბამისად, Meta Pixel Dashboard ახლა აჩვენებს **რეალურ მონაცემებს** Facebook-იდან, მათ შორის:

### ✅ დამატებული ფუნქციონალი

1. **Real-Time Event Tracking**

   - რეალურ დროში ივენთების ჩვენება
   - ივენთების რაოდენობა ტიპების მიხედვით
   - ბოლო ივენთების დეტალური ინფორმაცია

2. **Advanced Matching Parameters**

   - ელ. ფოსტა (Masked for privacy)
   - ტელეფონი (Masked for privacy)
   - IP მისამართი (Masked for privacy)
   - User Agent (ბრაუზერის ინფო)
   - Matching Rate %

3. **Statistics Overview**

   - სულ ივენთების რაოდენობა
   - Advanced Matching-ის მქონე ივენთები
   - Matching Rate პროცენტული მაჩვენებელი

4. **Recent Events Display**
   - ბოლო 20 ივენთის დეტალური ჩვენება
   - URL საიდანაც მოხდა ივენთი
   - Browser Information
   - Timestamp (ზუსტი დრო)
   - Advanced Matching მონაცემები

## 📂 შექმნილი/განახლებული ფაილები

### 1. API Endpoint

**ფაილი:** `web/src/app/api/admin/meta-pixel/events/route.ts`

```typescript
GET / api / admin / meta - pixel / events;
```

**რას აკეთებს:**

- აკავშირდება Facebook Graph API-სთან
- იღებს ბოლო 100 ივენთს
- ამუშავებს მონაცემებს და ქმნის summary-ს
- აბრუნებს დამუშავებულ მონაცემებს

**Response Format:**

```json
{
  "success": true,
  "events": [...],
  "eventSummary": {
    "summary": {
      "PageView": 45,
      "AddToCart": 12,
      "Purchase": 3,
      ...
    },
    "recentEvents": [...],
    "advancedMatchingData": [...],
    "totalEvents": 100,
    "eventsWithMatching": 67,
    "matchingRate": 67
  },
  "lastUpdated": "2025-10-09T..."
}
```

### 2. Dashboard Component

**ფაილი:** `web/src/modules/admin/components/meta-pixel-dashboard.tsx`

**ახალი Features:**

- ✅ Real-time data fetching
- ✅ Auto-refresh every 2 minutes
- ✅ Loading states
- ✅ Error handling
- ✅ Statistics cards
- ✅ Event counts display
- ✅ Recent events with details
- ✅ Advanced matching parameters display
- ✅ Manual refresh button

### 3. Updated Styles

**ფაილი:** `web/src/modules/admin/components/meta-pixel-dashboard.css`

**დამატებული სტილები:**

- `.stats-overview` - სტატისტიკის კარდები
- `.recent-events-list` - ბოლო ივენთების სია
- `.advanced-matching-info` - Advanced Matching ინფო
- `.event-count-display` - ივენთების რაოდენობა
- `.loading-state` - Loading animation
- `.error-banner` - შეცდომების ჩვენება

### 4. Environment Variables

**ფაილი:** `web/.env.local`

დამატებული:

```bash
META_PIXEL_ACCESS_TOKEN=EAAQHWdqgWZCs...
```

⚠️ **მნიშვნელოვანი:** `META_PIXEL_ACCESS_TOKEN` არ არის `NEXT_PUBLIC_` - ეს ნიშნავს რომ მას მხოლოდ server-side გამოიყენებს API route და არ გამოჩნდება client-side კოდში (უსაფრთხოებისთვის).

## 🎨 Dashboard ახალი სექციები

### 1. Statistics Overview (თავში)

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ 🎯 სულ ივენთი       │ 👥 Advanced Match    │ 📈 Matching Rate    │
│    127              │    85               │    67%              │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### 2. Tracked Events (რეალური რაოდენობით)

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ PageView            │ ViewContent         │ AddToCart           │
│ 45 ივენთი           │ 23 ივენთი           │ 12 ივენთი           │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### 3. Recent Events (ბოლო ივენთები)

```
┌───────────────────────────────────────────────────────────────┐
│ 📌 SubscribedButtonClick                 🕐 9 ოქტ. 2025, 01:45 │
├───────────────────────────────────────────────────────────────┤
│ 🌐 https://www.soulart.ge/login                               │
│                                                               │
│ ✓ Advanced Matching                                           │
│ ├─ 📧 Email    ├─ 📱 Phone    ├─ 🌍 IP Address               │
│                                                               │
│ Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...        │
└───────────────────────────────────────────────────────────────┘
```

## 🔒 უსაფრთხოება და Privacy

### 1. Masked Data

ყველა მგრძნობიარე მონაცემი masked-ია:

- Email: `***@***.***`
- Phone: `***-***-****`
- IP: `***.***.***.**`

### 2. Server-Side Only

Access Token გამოიყენება მხოლოდ server-side API route-ში:

```typescript
// ✅ Secure - სერვერზე
const accessToken = process.env.META_PIXEL_ACCESS_TOKEN;

// ❌ Never do this
const accessToken = process.env.NEXT_PUBLIC_META_PIXEL_ACCESS_TOKEN;
```

### 3. Admin Only Access

Dashboard ხელმისაწვდომია მხოლოდ `Role.Admin` მომხმარებლებისთვის.

## 📊 Facebook Graph API Integration

### Endpoints გამოყენებული

1. **Get Activities**

```
GET https://graph.facebook.com/v18.0/{pixel_id}/activities
```

აბრუნებს ბოლო ივენთებს დეტალური ინფორმაციით.

2. **Get Stats** (თუ ხელმისაწვდომია)

```
GET https://graph.facebook.com/v18.0/{pixel_id}/stats
```

აბრუნებს სტატისტიკას და insights-ებს.

### Response Data Processing

API route ამუშავებს მონაცემებს და ქმნის:

- Event Summary (რაოდენობა ტიპების მიხედვით)
- Recent Events (ბოლო 20 ივენთი დეტალებით)
- Advanced Matching Data (პარამეტრების ანალიზი)
- Matching Rate (% calculation)

## 🚀 როგორ მუშაობს

### 1. Data Flow

```
Facebook Meta Pixel → Events Occur → Stored in Facebook
                ↓
Admin Dashboard → API Call → Facebook Graph API
                ↓
Process Data → Display in Dashboard
                ↓
Auto-refresh every 2 minutes
```

### 2. Component Lifecycle

```typescript
useEffect(() => {
  // Initial fetch
  fetchEventData();

  // Auto-refresh every 2 minutes
  const interval = setInterval(fetchEventData, 120000);
  return () => clearInterval(interval);
}, []);
```

### 3. Manual Refresh

Dashboard-ზე არის "განახლება" ღილაკი რომელიც:

- Loading state-ში აყენებს dashboard-ს
- თავიდან იღებს მონაცემებს API-დან
- ანახლებს UI-ს ახალი მონაცემებით

## 🎯 რას აჩვენებს Dashboard

### Event Types (ტიპები)

- **PageView** - გვერდის ნახვა
- **ViewContent** - პროდუქტის ნახვა
- **AddToCart** - კალათაში დამატება
- **InitiateCheckout** - შეკვეთის დაწყება
- **Purchase** - შესყიდვა
- **Search** - ძიება
- **SubscribedButtonClick** - ღილაკზე დაჭერა (როგორც თქვენს მაგალითში)
- **Lead** - ლიდი
- **CompleteRegistration** - რეგისტრაცია

### Advanced Matching Parameters

Dashboard აჩვენებს რომელი პარამეტრები მოვიდა:

- ✅ Email - თუ მოვიდა
- ✅ Phone - თუ მოვიდა
- ✅ IP Address - თუ მოვიდა
- ✅ First Name, Last Name - თუ მოვიდა
- ✅ City, State, ZIP, Country - თუ მოვიდა

## 🧪 Testing

### 1. ტესტირება Local-ში

```bash
cd web
npm run dev
```

### 2. გახსენით Dashboard

```
http://localhost:3000/admin/meta-pixel
```

### 3. შეამოწმეთ Console

```javascript
// Browser DevTools Console
// უნდა ნახოთ:
console.log("Fetching Meta Pixel events...");
console.log("Event data:", data);
```

### 4. გააკეთეთ რამე Action საიტზე

- გახსენით რომელიმე გვერდი
- დაამატეთ პროდუქტი კალათაში
- გააკეთეთ Search
- შემდეგ Dashboard-ზე დააჭირეთ "განახლება"

## 📈 Monitoring

### რეალურ დროში მონიტორინგი

1. გახსენით Dashboard
2. დააჭირეთ "Facebook Events Manager" ღილაკს
3. გადადით Test Events-ზე
4. ნახავთ real-time ივენთებს როგორც ხდებიან

### Dashboard Auto-Refresh

Dashboard ავტომატურად ნახლებს მონაცემებს ყოველ 2 წუთში.

## 🔧 Troubleshooting

### თუ არ ჩანს მონაცემები

1. **შეამოწმეთ Access Token**

```bash
# .env.local ფაილში
META_PIXEL_ACCESS_TOKEN=EAAQHWdqgWZCs...
```

2. **გადატვირთეთ Server**

```bash
# Ctrl+C და თავიდან
npm run dev
```

3. **შეამოწმეთ API Response**
   გახსენით:

```
http://localhost:3000/api/admin/meta-pixel/events
```

თუ გამოვა error, შეამოწმეთ:

- Access Token არის valid
- Pixel ID სწორია
- Internet კავშირი მუშაობს

### თუ გამოდის "Failed to fetch"

**შესაძლო მიზეზები:**

1. Access Token expired - გენერირეთ ახალი Facebook Business Manager-ში
2. Pixel ID არასწორია - შეამოწმეთ .env.local
3. Facebook API Rate Limit - დაელოდეთ რამდენიმე წუთი

## 🎉 დასკვნა

Dashboard ახლა მზადაა და აჩვენებს:

- ✅ რეალურ ივენთებს Facebook-იდან
- ✅ Advanced Matching Parameters
- ✅ რეალურ დროში სტატისტიკას
- ✅ Matching Rate-ს
- ✅ ბოლო ივენთების დეტალებს
- ✅ ყველა ტექნიკურ ინფორმაციას

ყველაფერი უსაფრთხოდ, მხოლოდ ადმინისთვის ხელმისაწვდომი! 🔒
