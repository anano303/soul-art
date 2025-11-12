# 🔧 GA4 Custom Dimensions Setup Guide

## პრობლემა

Analytics Dashboard-ზე ერორების დეტალებში არ ჩანს **რეალური error message**, მხოლოდ page title და count. მაგალითად:

```
"Error occurred: Soulart - ნახატების და ხელნაკეთი ნივთების პირველი ონლაინ პლატფორმა საქართველოში (/)"
```

**რატომ?** GA4 Data API ვერ აბრუნებს event parameters-ს თუ ისინი არ არის რეგისტრირებული როგორც **Custom Dimensions**.

---

## ✅ გადაწყვეტა: Custom Dimensions-ების შექმნა

### 1️⃣ გადადი GA4 Admin-ში

1. გახსენი Google Analytics 4
2. დააჭირე **Admin** (⚙️ ქვედა მარცხენა კუთხეში)
3. აირჩიე შენი **Property**
4. იპოვე **Custom definitions** → **Custom dimensions**

### 2️⃣ შექმენი შემდეგი Custom Dimensions:

#### 📌 Error Tracking Dimensions

| Dimension name  | Event parameter | Scope | Description                                     |
| --------------- | --------------- | ----- | ----------------------------------------------- |
| `Error Type`    | `error_type`    | Event | Error category (api_error, network_error, etc.) |
| `Error Message` | `error_message` | Event | Actual error message text                       |
| `Error Stack`   | `error_stack`   | Event | JavaScript error stack trace                    |
| `API Endpoint`  | `api_endpoint`  | Event | Failed API endpoint URL                         |
| `API Status`    | `api_status`    | Event | HTTP status code (404, 500, etc.)               |
| `API Method`    | `api_method`    | Event | HTTP method (GET, POST, etc.)                   |
| `Page URL`      | `page_url`      | Event | Full page URL where error occurred              |

#### 📌 User Journey Dimensions

| Dimension name | Event parameter | Scope | Description                                          |
| -------------- | --------------- | ----- | ---------------------------------------------------- |
| `User Path`    | `path`          | Event | Sequential page path (e.g., `/` → `/shop` → `/cart`) |
| `Journey Step` | `step`          | Event | Current step in user journey                         |

---

### 3️⃣ როგორ შევქმნათ Custom Dimension

**ნაბიჯები თითოეული dimension-ისთვის:**

1. დააჭირე **"Create custom dimensions"**
2. შეავსე ველები:
   - **Dimension name**: `Error Message` (ზემოთ ცხრილიდან)
   - **Scope**: `Event`
   - **Description**: `Actual error message text`
   - **Event parameter**: `error_message` (ზუსტად ეს სახელი!)
3. დააჭირე **"Save"**
4. გაიმეორე ყველა dimension-ისთვის

---

## 🔄 რა შეიცვლება შემდეგ

### ამჟამად (Custom Dimensions-ის გარეშე):

```json
{
  "message": "Error occurred: Soulart - ნახატების... (/)",
  "endpoint": "N/A",
  "status": "Error",
  "page": "/",
  "count": 208
}
```

### Custom Dimensions-ის შემდეგ:

```json
{
  "message": "TypeError: Cannot read property 'map' of undefined",
  "endpoint": "/v1/products",
  "status": "500",
  "page": "/shop",
  "errorType": "api_error",
  "errorStack": "at ProductList.tsx:45:12...",
  "count": 41
}
```

---

## ⏱️ რამდენი ხანი სჭირდება?

- **Custom Dimensions შექმნა**: 5-10 წუთი
- **მონაცემების დაგროვება**: 24-48 საათი
- GA4 ინიცირებას და მონაცემების დამუშავებას 24-48 საათი სჭირდება

---

## 🧪 როგორ შევამოწმოთ

### 1. Browser Console-ში:

```javascript
// Enable debug mode
localStorage.setItem("GA4_DEBUG", "true");

// Trigger an error
throw new Error("Test error");

// Console-ში უნდა დაინახო:
// [GA4 Error Tracking] {
//   error_type: "other",
//   error_message: "Test error",
//   error_stack: "Error: Test error at...",
//   page_path: "/",
//   page_url: "http://localhost:3000/",
//   ...
// }
```

### 2. GA4 DebugView:

1. GA4 → **Reports** → **Realtime**
2. მარჯვენა მხარეს **DebugView**
3. გააკეთე error trigger
4. დაინახე `error_occurred` event და მისი parameters

### 3. Analytics Dashboard (24-48 საათის შემდეგ):

- გადადი `/admin/analytics`
- დააჭირე **General Errors** → expand
- უნდა ჩანდეს **ზუსტი error message-ები**

---

## 📊 Custom Dimensions-ის სრული სია

```typescript
// web/src/lib/ga4-analytics.ts

// Error tracking იგზავნის ამ parameters-ს:
trackError(errorType, errorMessage, errorStack, additionalData) {
  ga4Event("error_occurred", {
    error_type: errorType,          // → Custom Dimension: "Error Type"
    error_message: errorMessage,    // → Custom Dimension: "Error Message"
    error_stack: errorStack,        // → Custom Dimension: "Error Stack"
    page_path: window.location.pathname,
    page_url: window.location.href, // → Custom Dimension: "Page URL"
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...additionalData
  });
}

// API tracking იგზავნის:
trackAPICall(endpoint, method, status, duration, success) {
  ga4Event("api_call", {
    api_endpoint: endpoint,    // → Custom Dimension: "API Endpoint"
    api_method: method,        // → Custom Dimension: "API Method"
    api_status: status,        // → Custom Dimension: "API Status"
    api_duration_ms: duration,
    api_success: success,
    page_path: window.location.pathname
  });
}
```

---

## ✅ Checklist

- [ ] გადადი GA4 Admin → Custom definitions → Custom dimensions
- [ ] შექმენი 7 Error Tracking dimensions
- [ ] შექმენი 2 User Journey dimensions
- [ ] დაელოდე 24-48 საათს მონაცემების დაგროვებას
- [ ] შეამოწმე Analytics Dashboard-ზე
- [ ] გადაამოწმე Browser Console logs [GA4 Error Tracking] prefix-ით

---

## 🔍 დამატებითი რესურსები

- [GA4 Custom Dimensions Documentation](https://support.google.com/analytics/answer/10075209)
- [GA4 Data API Schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
- [Event Parameters vs Custom Dimensions](https://support.google.com/analytics/answer/11396839)

---

## 💡 რჩევები

1. **Event parameter სახელები უნდა იყოს ზუსტად ისეთი** როგორც კოდშია (`error_message`, არა `errorMessage`)
2. **Dimension name** შეიძლება იყოს ნებისმიერი user-friendly სახელი (`Error Message`)
3. **24-48 საათის შემდეგ** Backend-ში შეიცვლება query რომ გამოიყენოს custom dimensions
4. **DebugView** რეალურ დროში აჩვენებს events-ს, მაგრამ Reports 24-48 საათი ჭირდება

---

## 🚨 Fallback გადაწყვეტა (Custom Dimensions-ის გარეშე)

თუ Custom Dimensions-ების შექმნა არ შეგიძლია, გამოიყენე:

1. **Browser Console Logs**:

   ```javascript
   // Frontend-ზე console-ში ეძებე:
   [GA4 Error Tracking] { error_message: "..." }
   ```

2. **GA4 DebugView**:

   - Real-time error events და მათი parameters

3. **Backend Logs**:
   - Server-ის console-ში API errors

---

შექმნი Custom Dimensions-ები და 24-48 საათში Analytics Dashboard სრულად იმუშავებს! 🎯
