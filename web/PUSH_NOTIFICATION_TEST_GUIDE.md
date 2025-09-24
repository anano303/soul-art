# 🔔 Push Notification Test Guide

## როგორ ვტესტავთ Push Notification სისტემას

### ✅ 1. მომხმარებლის მხრიდან (Browser)

1. **გახსენით საიტი localhost:3000**
2. **დაელოდეთ 10 წამს** - გამოვა notification permission prompt
3. **დაჭირეთ "ნების დართვა"** ღილაკს
4. **Browser-ში "Allow" ღილაკი დაჭირეთ**

### ✅ 2. Admin Panel-ით ტესტირება

#### A) ახალი ბანერის (ფასდაკლება) დამატება:
1. **Admin პანელი** → `/admin/banners`  
2. **"ახალი ბანერი"** ღილაკი
3. **Title-ში** ჩაწერეთ: "ფასდაკლება" ან "discount" ან "აქცია"
4. **"შენახვა"** დაჭირეთ
5. **შედეგი:** ყველა subscriber-ს მოვა შეტყობინება

#### B) ახალი პროდუქტის დამატება:
1. **Admin პანელი** → `/admin/products`
2. **"ახალი პროდუქტი"** → ყველაფერი შეავსეთ
3. **"შენახვა"** დაჭირეთ
4. **შედეგი:** ახალი პროდუქტის შეტყობინება

#### C) შეკვეთის სტატუსის განახლება:
1. **Admin პანელი** → `/admin/orders`
2. **შეკვეთა გახსენით** → `Order Details`
3. **"Mark as Delivered"** დაჭირეთ
4. **შედეგი:** მომხმარებელს მოვა მიღების შეტყობინება

### 🔧 3. Manual Testing (Developer Console)

Browser Console-ში ჩაწერეთ:

```javascript
// Subscription Status შემოწმება
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.getSubscription();
}).then(subscription => {
  if (subscription) {
    console.log('✅ Subscribed:', subscription.endpoint);
  } else {
    console.log('❌ Not subscribed');
  }
});

// Manual Test Notification
fetch('/api/push/new-product', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product: {
      id: 'test123',
      title: 'ტესტური პროდუქტი',
      imageUrl: '/logo.png'
    }
  })
}).then(response => response.json()).then(data => {
  console.log('Test result:', data);
});
```

### 📊 4. Subscribers რაოდენობის შემოწმება

Console-ში ნახეთ:
```
💫 ახალი push notification subscription დარეგისტრირდა
✅ New product notification sent: [product name]
✅ Discount notification sent for new banner
✅ Order delivery notification sent
```

### 🚨 5. Troubleshooting

#### "0 მომხმარებელს გაეგზავნა":
- **მიზეზი:** არავინ არ არის subscribed
- **გადაწყვეტა:** ახალი tab-ით გახსენით, permission მისცეთ

#### Notification არ მოდის:
1. **Browser Settings** → Notifications → Allow for localhost
2. **Service Worker:** DevTools → Application → Service Workers
3. **Console Errors:** F12 → Console tab

#### Browser Compatibility:
- ✅ Chrome, Edge, Firefox, Opera
- ❌ Safari (limited PWA support)  
- ✅ Mobile Chrome/Firefox

### 📱 6. Mobile Testing

#### Android:
1. Chrome browser → Options → "Add to Home Screen"
2. Notifications permission გაცემა
3. PWA როგორც App გახსნა

#### iOS:
1. Safari → Share → "Add to Home Screen"  
2. Limited push notification support
3. PWA მხარდაჭერა შეზღუდული

### ⚡ 7. Performance Testing

```javascript
// Service Worker Status
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Active Service Workers:', registrations.length);
});

// Cache Status  
caches.keys().then(cacheNames => {
  console.log('Available Caches:', cacheNames);
});

// Push Manager Status
navigator.serviceWorker.ready.then(registration => {
  console.log('Push Manager Available:', !!registration.pushManager);
});
```

---

## 🎯 Expected Results

### წარმატებული ტესტი:
1. **Permission granted** ✅
2. **Service Worker active** ✅  
3. **Subscription created** ✅
4. **Notifications received** ✅
5. **Console logs positive** ✅

### Console Output:
```
💫 ახალი push notification subscription დარეგისტრირდა
✅ ახალი პროდუქტის შეტყობინება გაიგზავნა 1 მომხმარებელზე  
✅ ფასდაკლების შეტყობინება გაიგზავნა 1 მომხმარებელზე
✅ შეკვეთის შეტყობინება გაიგზავნა მომხმარებელს
```