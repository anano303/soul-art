# 🔴 Real-Time Live Users Feature

## ფუნქციონალი

Analytics Dashboard-ზე დამატებულია **Live Users** ღილაკი, რომელიც აჩვენებს რამდენი მომხმარებელია ამჟამად აქტიური საიტზე.

---

## 🎯 რას აკეთებს?

### Frontend (GA4 Dashboard)

1. **Live Users ღილაკი** - თავში, მარჯვენა მხარეს

   - 🟢 Pulsing green indicator - აჩვენებს რომ live tracking-ია
   - ღილაკზე დაჭერით იხსნება panel

2. **Live Users Panel**
   - აჩვენებს **რეალურ რაოდენობას** აქტიური მომხმარებლების
   - "Active Users" - ბოლო 30 წუთში აქტიურები
   - 🔄 Refresh ღილაკი - ხელით განახლება
   - **Auto-refresh** - ავტომატურად ყოველ 30 წამში განახლდება

### Backend (NestJS)

- **GET /analytics/ga4/realtime** - API endpoint
- გამოიყენებს GA4 Real-Time Reporting API
- აბრუნებს: `{ activeUsers: number, timestamp: string }`

---

## 📱 Responsive Design

### Desktop

- ღილაკი header-ში, title-ის გვერდით
- Panel full width, horizontal layout

### Mobile

- ღილაკი full width
- Panel vertical stack
- Large centered counter
- Full width refresh button

---

## 🎨 Design Features

1. **Gradient Button** - Purple gradient with glow effect
2. **Pulsing Indicator** - Animated green dot (like live streaming)
3. **Large Counter** - 3rem font size, gradient background
4. **Auto-refresh** - Silent background updates every 30s
5. **Smooth Animations** - Slide down panel, pulse effect

---

## 🔧 Technical Details

### State Management

```typescript
const [showLiveUsers, setShowLiveUsers] = useState(false);
const [liveUsers, setLiveUsers] = useState<number | null>(null);
const [liveUsersLoading, setLiveUsersLoading] = useState(false);
```

### API Call

```typescript
const fetchLiveUsers = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4/realtime`,
    { credentials: "include" }
  );
  const data = await response.json();
  setLiveUsers(data.activeUsers || 0);
};
```

### Auto-Refresh Logic

```typescript
useEffect(() => {
  let interval: NodeJS.Timeout;

  if (showLiveUsers) {
    interval = setInterval(() => {
      fetchLiveUsers();
    }, 30000); // Every 30 seconds
  }

  return () => clearInterval(interval);
}, [showLiveUsers]);
```

### Backend Real-Time Report

```typescript
async getRealtimeUsers() {
  const response = await this.analyticsDataClient.properties.runRealtimeReport({
    property: `properties/${this.propertyId}`,
    requestBody: {
      metrics: [{ name: 'activeUsers' }],
    },
  });

  return {
    activeUsers: parseInt(response.data.rows?.[0]?.metricValues?.[0]?.value || '0'),
    timestamp: new Date().toISOString(),
  };
}
```

---

## 🚀 როგორ გამოვიყენო?

1. გადადი `/admin/analytics`
2. მარჯვენა ზედა კუთხეში დაინახავ **"Live Users"** ღილაკს (mobile-ზე ქვემოთ)
3. დააჭირე ღილაკს
4. გაიხსნება panel აქტიური მომხმარებლების რაოდენობით
5. Panel ავტომატურად განახლდება ყოველ 30 წამში
6. შეგიძლია ხელით განახლება 🔄 Refresh ღილაკით

---

## 📊 რა მონაცემებს აჩვენებს?

### Active Users (activeUsers)

- **განმარტება**: მომხმარებლები რომლებიც **ბოლო 30 წუთში** იყვნენ აქტიურები საიტზე
- **წყარო**: GA4 Real-Time Reporting API
- **განახლება**: Real-time (ყოველ 30 წამში frontend-ზე)

### არ არის Real-Time როდესაც:

- User იხსნის გვერდს მაგრამ არ აკეთებს interaction-ს
- Browser-ი background tab-შია და არ აგზავნის events-ს
- GA4-ს ჭირდება რამდენიმე წამი processing-ისთვის (lag 1-2 წამი)

---

## 🔐 Security

- **Authentication**: `@UseGuards(JwtAuthGuard, RolesGuard)`
- **Authorization**: `@Roles(Role.Admin)` - მხოლოდ Admin-ებს
- **Credentials**: `credentials: "include"` - Cookie-based auth

---

## 🎨 CSS Classes

```css
.live-users-btn          // Main button
.live-indicator          // Pulsing green dot
.live-users-panel        // Dropdown panel
.live-users-loading      // Loading state
.live-users-content      // Main content
.live-users-count        // Counter box
.live-users-number       // Big number (3rem)
.live-users-label        //  Active Users  text
.live-users-info         // Description section
.refresh-btn             // Manual refresh button;
```

---

## 🐛 Troubleshooting

### ღილაკი არ ჩანს

- შეამოწმე `@Roles(Role.Admin)` - არის თუ არა admin role
- Check browser console for auth errors

### აჩვენებს 0 მომხმარებელს

- GA4 Real-Time API იწყებს tracking-ს რამდენიმე წუთში
- გადადი საიტზე და გააკეთე რამდენიმე page view
- დაელოდე 1-2 წუთს

### Auto-refresh არ მუშაობს

- Check browser console for fetch errors
- Verify panel არის ღია (`showLiveUsers === true`)
- Check `useEffect` cleanup function

---

## 📈 GA4 Setup Requirements

### Real-Time Reporting API უნდა იყოს enabled:

1. GA4 Admin → Data API
2. Check "Real-time Reporting API" is enabled
3. Service Account უნდა ჰქონდეს "Viewer" role minimum

### Permissions:

```json
{
  "role": "roles/analytics.viewer",
  "resource": "properties/{PROPERTY_ID}"
}
```

---

## 🎯 Future Enhancements

- [ ] Real-time pages list (რომელ გვერდებზე არიან users)
- [ ] Real-time events stream
- [ ] User location map (country/city)
- [ ] Device breakdown (mobile/desktop)
- [ ] Traffic sources (referral/direct/organic)
- [ ] Notifications when users > threshold

---

## ✅ Checklist

- [x] Frontend: Live Users button with pulse indicator
- [x] Frontend: Expandable panel
- [x] Frontend: Auto-refresh every 30s
- [x] Frontend: Manual refresh button
- [x] Frontend: Loading states
- [x] Frontend: Responsive design (mobile/tablet/desktop)
- [x] Backend: `/analytics/ga4/realtime` endpoint
- [x] Backend: Real-Time Reporting API integration
- [x] Backend: Error handling
- [x] Security: Admin-only access
- [x] CSS: Gradient buttons, animations, pulse effect
- [x] Documentation: Complete setup guide

---

**შედეგი**: ახლა Admin-ებს შეუძლიათ რეალურ დროში ნახონ რამდენი მომხმარებელია აქტიური საიტზე! 🎉
