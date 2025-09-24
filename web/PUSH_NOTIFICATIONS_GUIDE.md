# 🔔 Push Notifications for Soulart - სამუშაო ინსტრუქციები

## 📋 რა არის დაყენებული

### ✅ **კომპონენტები და ფაილები:**

1. **📱 Push Notification Manager** (`src/components/push-notifications/`)

   - მომხმარებლის ნებართვის მოთხოვნა
   - Subscription-ის მართვა
   - ქართული ინტერფეისი

2. **🎛️ Admin Test Panel** (`src/components/push-test-panel/`)

   - Development-ში admin-ისთვის ტესტების გასაშვებად
   - 3 ტიპის შეტყობინების ტესტი

3. **🔧 API Endpoints:**

   - `/api/push` - ძირითადი push API
   - `/api/push/new-product` - ახალი პროდუქტისთვის
   - `/api/push/discount` - ფასდაკლებისთვის
   - `/api/push/order-status` - შეკვეთის სტატუსისთვის

4. **⚙️ Service Worker** (`public/sw-push.js`)

   - Push notification-ების დამუშავება
   - Click-ების handle
   - ქართული შეტყობინებები

5. **🔐 VAPID Keys** (`.env.local`)
   - Push notification-ების authentication
   - უსაფრთხოება

---

## 🚀 **როგორ გამოვიყენო?**

### 1️⃣ **მომხმარებლისთვის:**

- საიტზე შესვლისას გამოჩნდება push notification-ის permission
- მომხმარებელი ირჩევს სამ ტიპს შორის:
  - 🎨 **ახალი პროდუქტები**
  - 💰 **ფასდაკლებები**
  - 📦 **შეკვეთის სტატუსი**

### 2️⃣ **Admin/Developer-ისთვის:**

- Development mode-ში ჩანს "🧪 Admin: ტესტური შეტყობინებები" ღილაკი
- შესაძლებელია ყველა ტიპის შეტყობინების ტესტი

---

## 🔧 **როგორ ინტეგრირება თქვენს სისტემაში**

### **ახალი პროდუქტის დამატებისას:**

```typescript
// თქვენს product creation code-ში
import { sendNewProductNotification } from "@/app/api/push/route";

// პროდუქტის შექმნის შემდეგ
await sendNewProductNotification({
  id: newProduct.id,
  title: newProduct.title,
  imageUrl: newProduct.imageUrl,
});
```

### **ფასდაკლების დაყენებისას:**

```typescript
import { sendDiscountNotification } from "@/app/api/push/route";

await sendDiscountNotification({
  title: "სპეციალური ფასდაკლება",
  percentage: 25,
  category: "ნახატები", // optional
});
```

### **შეკვეთის სტატუსის შეცვლისას:**

```typescript
import { sendOrderStatusNotification } from "@/app/api/push/route";

await sendOrderStatusNotification({
  id: order.id,
  status: "shipped", // confirmed, processing, shipped, delivered, cancelled
  customerEmail: order.customerEmail,
});
```

---

## 🌐 **API Endpoints გამოყენება**

### **ახალი პროდუქტი:**

```bash
POST /api/push/new-product
{
  "product": {
    "id": "prod-123",
    "title": "ახალი ნამუშევარი",
    "imageUrl": "/product-image.jpg"
  }
}
```

### **ფასდაკლება:**

```bash
POST /api/push/discount
{
  "discount": {
    "title": "შემოდგომითი ფასდაკლება",
    "percentage": 30,
    "category": "ნახატები"
  }
}
```

### **შეკვეთის სტატუსი:**

```bash
POST /api/push/order-status
{
  "order": {
    "id": "ORDER-12345",
    "status": "shipped",
    "customerEmail": "customer@example.com"
  }
}
```

---

## 📊 **ტესტირება**

### **Development Mode-ში:**

1. გახსენით http://localhost:3001
2. საიტზე გამოჩნდება push notification prompt
3. დაუთანხმეთ notifications
4. ჩანს "🧪 Admin: ტესტური შეტყობინებები" ღილაკი
5. დააჭირეთ და გაშვებით ტესტები

### **Manual API ტესტი:**

```bash
# ტესტური ახალი პროდუქტი
GET /api/push/new-product

# ტესტური ფასდაკლება
GET /api/push/discount

# ტესტური შეკვეთის სტატუსი
GET /api/push/order-status
```

---

## ⚠️ **მნიშვნელოვანი შენიშვნები**

1. **VAPID Keys:** `.env.local` ფაილში უკვე გენერირებულია
2. **Browser Support:** მუშაობს Chrome, Firefox, Safari, Edge-ზე
3. **HTTPS:** Production-ში სავალდებულოა HTTPS
4. **Permissions:** მომხმარებელმა უნდა დაუთანხმოს notifications
5. **Testing:** Development-ში admin panel-ით ადვილად ტესტირდება

---

## 🎯 **შემდეგი ნაბიჯები**

1. **დაამატეთ თქვენს business logic-ში** API calls
2. **მოახდინეთ ტესტირება** development mode-ში
3. **განათავსეთ production-ზე** HTTPS-თან ერთად
4. **მონიტორინგი** - მუშაობდეთ საშუალო გაგზავნის მაჩვენებლებით

---

## 🆘 **საჭიროების შემთხვევაში:**

```bash
# Push API-ის სტატუსის შემოწმება
GET /api/push?action=stats

# ღია კონფიგურაცია
- VAPID Keys: .env.local
- Service Worker: public/sw-push.js
- Components: src/components/push-notifications/
```

**🎉 ყველაფერი მზადაა მუშაობისთვის!** თქვენ უნდა მხოლოდ დაამატოთ API calls თქვენს არსებულ სისტემაში.
