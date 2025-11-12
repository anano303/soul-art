# GA4 Error Tracking - Technical Implementation

## 📁 შეცვლილი ფაილები

### 1. `web/src/lib/ga4-analytics.ts`

#### Changes:

**A) trackError ფუნქციის გაუმჯობესება:**

```typescript
export const trackError = (
  errorType:
    | "page_error"
    | "api_error"
    | "network_error"
    | "auth_error"
    | "validation_error"
    | "other",
  errorMessage: string,
  errorStack?: string,
  additionalData?: Record<string, unknown>
) => {
  const errorData = {
    error_type: errorType,
    error_message: errorMessage,
    error_stack: errorStack,
    page_path: window.location.pathname,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  ga4Event("error_occurred", errorData);
  console.error("[GA4 Error Tracking]", errorData);
};
```

**რას ამატებს:**

- 3 ახალი error type: `auth_error`, `validation_error`, `other`
- `page_url`: სრული URL
- `user_agent`: browser info
- `timestamp`: ISO format timestamp
- Console logging დებაგინგისთვის

---

**B) trackAPICall ფუნქციის გაუმჯობესება:**

```typescript
export const trackAPICall = (
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  success: boolean
) => {
  const apiCallData = {
    api_endpoint: endpoint,
    api_method: method,
    api_status: status,
    api_duration_ms: duration,
    api_success: success,
    page_path: window.location.pathname,
  };

  ga4Event("api_call", apiCallData);

  // If API call failed, track as separate error event
  if (!success) {
    const statusCategory =
      status >= 500
        ? "server_error"
        : status >= 400 && status < 500
        ? "client_error"
        : "unknown_error";

    ga4Event("api_error", {
      ...apiCallData,
      error_category: statusCategory,
      error_message: `API ${method} ${endpoint} failed with status ${status}`,
    });
  }
};
```

**რას ამატებს:**

- `page_path`: რომელ გვერდზე მოხდა API call
- **Separate `api_error` event** წარუმატებელი call-ებისთვის
- `error_category`: "server_error" (5xx) ან "client_error" (4xx)
- `error_message`: ავტომატური შეტყობინება

---

**C) trackNetworkError ფუნქციის გაუმჯობესება:**

```typescript
export const trackNetworkError = (
  url: string,
  errorMessage: string,
  additionalData?: Record<string, unknown>
) => {
  trackError("network_error", errorMessage, undefined, {
    failed_url: url,
    ...additionalData,
  });
};
```

**რას ამატებს:**

- `additionalData` parameter - დამატებითი კონტექსტისთვის

---

### 2. `web/src/lib/fetch-with-auth.ts`

#### Changes:

**A) Enhanced Error Tracking in catch block:**

```typescript
} catch (error) {
  console.error(`[fetchWithAuth] error:`, error);

  // Determine error type based on error and response status
  let errorType: "api_error" | "network_error" | "auth_error" | "validation_error" = "network_error";
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  if (error instanceof Error && errorMessage.includes("Failed to fetch")) {
    errorType = "network_error";
  } else if (errorMessage.includes("სესია ვადაგასულია") || errorMessage.includes("unauthorized")) {
    errorType = "auth_error";
  } else if (errorMessage.includes("Invalid") || errorMessage.includes("validation")) {
    errorType = "validation_error";
  } else {
    errorType = "api_error";
  }

  // Track detailed error with proper categorization
  trackNetworkError(
    url,
    errorMessage,
    {
      error_type: errorType,
      api_endpoint: url,
      api_method: method,
      error_stack: error instanceof Error ? error.stack : undefined,
    }
  );

  throw error;
}
```

**რას ამატებს:**

- **ავტომატური error type detection**:
  - "Failed to fetch" → `network_error`
  - "სესია ვადაგასულია" / "unauthorized" → `auth_error`
  - "Invalid" / "validation" → `validation_error`
  - სხვა → `api_error`
- **დამატებითი კონტექსტი**:
  - `error_type`
  - `api_endpoint`
  - `api_method`
  - `error_stack`

---

**B) Better Error Handling in Response Parsing:**

```typescript
if (!response.ok) {
  let errorMessage = "Unknown error";
  let errorDetails: Record<string, unknown> = {};

  try {
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();

      errorDetails = {
        error_data: JSON.stringify(errorData),
        status_code: response.status,
        status_text: response.statusText,
      };

      // ... parse error message
    } else {
      // Not JSON response
      const textError = await response.text();
      errorMessage = `შეცდომა: ${response.status} ${response.statusText}`;
      errorDetails = {
        text_error: textError,
        status_code: response.status,
        status_text: response.statusText,
      };
    }
  } catch (parseError) {
    errorMessage = `შეცდომა: ${response.status} ${response.statusText}`;
    errorDetails = {
      parse_error:
        parseError instanceof Error ? parseError.message : "Failed to parse",
      status_code: response.status,
      status_text: response.statusText,
    };
  }

  throw new Error(errorMessage);
}
```

**რას ამატებს:**

- დეტალური error parsing
- `errorDetails` object - დამატებითი ინფორმაციისთვის
- უკეთესი handling non-JSON responses-ისთვის

---

## 🎯 GA4 Events რომელიც ეხლა იგზავნება

### Event 1: `api_call`

**ყოველი API request-ისთვის (წარმატებული და წარუმატებელი)**

Parameters:

```json
{
  "api_endpoint": "/v1/users/me/addresses/xxx",
  "api_method": "PUT",
  "api_status": 500,
  "api_duration_ms": 234,
  "api_success": false,
  "page_path": "/profile/addresses"
}
```

---

### Event 2: `api_error`

**მხოლოდ წარუმატებელი API requests-ისთვის**

Parameters:

```json
{
  "api_endpoint": "/v1/users/me/addresses/xxx",
  "api_method": "PUT",
  "api_status": 500,
  "api_duration_ms": 234,
  "api_success": false,
  "page_path": "/profile/addresses",
  "error_category": "server_error",
  "error_message": "API PUT /v1/users/me/addresses/xxx failed with status 500"
}
```

---

### Event 3: `error_occurred`

**ნებისმიერი ტიპის ერორისთვის**

Parameters (API error case):

```json
{
  "error_type": "api_error",
  "error_message": "Internal server error",
  "error_stack": "...",
  "page_path": "/profile/addresses",
  "page_url": "https://soulart.ge/profile/addresses",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-11-13T12:34:56.789Z",
  "failed_url": "/v1/users/me/addresses/xxx",
  "api_endpoint": "/v1/users/me/addresses/xxx",
  "api_method": "PUT"
}
```

Parameters (Network error case):

```json
{
  "error_type": "network_error",
  "error_message": "Failed to fetch",
  "page_path": "/shop",
  "page_url": "https://soulart.ge/shop",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-11-13T12:34:56.789Z",
  "failed_url": "/v1/products",
  "api_endpoint": "/v1/products",
  "api_method": "GET"
}
```

Parameters (Auth error case):

```json
{
  "error_type": "auth_error",
  "error_message": "სესია ვადაგასულია, გთხოვთ თავიდან შეხვიდეთ",
  "page_path": "/checkout",
  "page_url": "https://soulart.ge/checkout",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-11-13T12:34:56.789Z",
  "failed_url": "/v1/orders",
  "api_endpoint": "/v1/orders",
  "api_method": "POST"
}
```

---

## 📊 Event Flow Diagram

```
User Action (e.g., Click "Update Address")
    ↓
fetchWithAuth() called
    ↓
[START] Performance timer starts
    ↓
HTTP Request sent
    ↓
    ├─── ✅ Success (200-299)
    │       ↓
    │    trackAPICall(endpoint, method, status, duration, true)
    │       ↓
    │    Event: api_call (success=true)
    │       ↓
    │    Return response
    │
    └─── ❌ Error (4xx, 5xx)
            ↓
         trackAPICall(endpoint, method, status, duration, false)
            ↓
         Event: api_call (success=false)
            ├─── Event: api_error (with error_category)
            │
            ↓
         Error thrown & caught in catch block
            ↓
         Determine error type
            ↓
         trackNetworkError(url, message, additionalData)
            ↓
         Event: error_occurred (with full context)
            ↓
         Error re-thrown to caller
```

---

## 🔍 Error Type Detection Logic

```typescript
// In catch block of fetchWithAuth()

if (errorMessage.includes("Failed to fetch")) {
  // Network connection issue
  errorType = "network_error";
} else if (
  errorMessage.includes("სესია ვადაგასულია") ||
  errorMessage.includes("unauthorized")
) {
  // Authentication/session issue
  errorType = "auth_error";
} else if (
  errorMessage.includes("Invalid") ||
  errorMessage.includes("validation")
) {
  // Data validation issue
  errorType = "validation_error";
} else {
  // General API error
  errorType = "api_error";
}
```

---

## 🧪 Testing

### ტესტი 1: API Error (500)

```typescript
// Trigger a 500 error
PUT / v1 / users / me / addresses / invalid - id;

// Expected GA4 Events:
// 1. api_call (success=false, status=500)
// 2. api_error (error_category="server_error")
// 3. error_occurred (error_type="api_error")
```

### ტესტი 2: Network Error

```typescript
// Disconnect internet and try to load page

// Expected GA4 Events:
// 1. error_occurred (error_type="network_error")
```

### ტესტი 3: Auth Error

```typescript
// Clear cookies and try authenticated request

// Expected GA4 Events:
// 1. api_call (success=false, status=401)
// 2. api_error (error_category="client_error")
// 3. error_occurred (error_type="auth_error")
```

---

## 📋 Checklist

- ✅ `ga4-analytics.ts` - trackError გაუმჯობესებული
- ✅ `ga4-analytics.ts` - trackAPICall გაუმჯობესებული
- ✅ `ga4-analytics.ts` - trackNetworkError გაუმჯობესებული
- ✅ `fetch-with-auth.ts` - error categorization დამატებული
- ✅ `fetch-with-auth.ts` - detailed error context დამატებული
- ✅ TypeScript types updated (auth_error, validation_error)
- ✅ Backward compatible (არსებული code არ იშლება)
- ✅ Console logging for debugging

---

## 🚀 Deployment

### ნაბიჯი 1: კოდის Commit

```bash
git add web/src/lib/ga4-analytics.ts web/src/lib/fetch-with-auth.ts
git commit -m "feat: Enhanced GA4 error tracking with detailed categorization"
```

### ნაბიჯი 2: Build & Deploy

```bash
cd web
npm run build
# Deploy to production
```

### ნაბიჯი 3: Verify in GA4

1. Open GA4 → Configure → DebugView
2. Trigger an error (e.g., invalid API request)
3. Check that events appear with proper parameters

### ნაბიჯი 4: Create Custom Reports

Follow instructions in `GA4_ERROR_TRACKING_GUIDE.md`

---

## 📝 Notes

- **არ იშლება არსებული functionality** - ყველა ძველი code იმუშავებს
- **Backward compatible** - არსებული `trackError()` calls იმუშავებს უცვლელად
- **Console logs** - დებაგინგისთვის რჩება browser console-ში
- **Performance** - minimal overhead (just additional properties in events)

---

## 🎓 რას ვსწავლობთ ერორებიდან

ახლა GA4-დან შეგვიძლია ვნახოთ:

1. **რომელი API endpoint-ები ყველაზე მეტად ფეილავენ**
2. **4xx vs 5xx ერორების თანაფარდობა** (client vs server issues)
3. **რომელ გვერდებზე ყველაზე მეტი ერორი**
4. **Authentication issues frequency**
5. **Network connectivity problems**
6. **Validation errors patterns**
7. **Error trends over time**
8. **User impact** (რამდენი user-ი ზუსტად)

**ყველაფერი real-time და actionable!** 🎯
