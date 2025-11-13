# 🔍 Error Tracking & Debugging Guide

## Problem

General Status errors show "JS Error" without detailed error messages and stack traces.

## Solution

### 1. Configure GA4 Custom Dimensions

To see detailed error messages in GA4 Analytics Dashboard, you need to register custom dimensions in Google Analytics 4:

#### Steps:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property (Soul Art)
3. Navigate to **Admin** (⚙️ bottom left)
4. Under **Property**, click **Custom definitions**
5. Click **Create custom dimension**

#### Add these dimensions:

**Dimension 1: Error Message**

- Dimension name: `error_message`
- Scope: `Event`
- Description: `JavaScript error message text`
- Event parameter: `error_message`

**Dimension 2: Error Type**

- Dimension name: `error_type`
- Scope: `Event`
- Description: `Type of error (TypeError, ReferenceError, etc.)`
- Event parameter: `error_type`

**Dimension 3: Error Stack**

- Dimension name: `error_stack`
- Scope: `Event`
- Description: `Error stack trace for debugging`
- Event parameter: `error_stack`

**Dimension 4: API Endpoint** (for API errors)

- Dimension name: `api_endpoint`
- Scope: `Event`
- Description: `API endpoint that failed`
- Event parameter: `api_endpoint`

**Dimension 5: API Status** (for API errors)

- Dimension name: `api_status`
- Scope: `Event`
- Description: `HTTP status code of failed API call`
- Event parameter: `api_status`

#### Note:

- It may take 24-48 hours for custom dimensions to start collecting data
- Historical data will NOT be backfilled - only new events after setup

---

### 2. Verify Error Tracking is Working

#### Frontend Error Tracking

The frontend already tracks errors automatically via `ga4-analytics.ts`:

```typescript
// Global error handler
window.addEventListener("error", (event) => {
  trackError("page_error", event.message, event.error?.stack, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  trackError(
    "other",
    event.reason?.message || "Unhandled Promise Rejection",
    event.reason?.stack
  );
});
```

#### Manual Error Tracking

You can also track errors manually:

```typescript
import { trackError } from "@/lib/ga4-analytics";

try {
  // Your code
} catch (error) {
  trackError("validation_error", error.message, error.stack, {
    component: "CheckoutForm",
  });
}
```

---

### 3. Test Error Tracking

#### Test in Browser Console:

```javascript
// Trigger a test error
throw new Error("Test error from console");

// Check if event was sent
// Open DevTools → Network → Filter by "collect" → Look for GA4 requests
```

#### Check GA4 DebugView:

1. Go to GA4 → **Admin** → **DebugView**
2. Enable debug mode in your app (add `?debug_mode=true` to URL)
3. Trigger an error
4. See event in DebugView with all parameters

---

### 4. Update Backend to Read Custom Dimensions

After GA4 custom dimensions are created, update the backend query:

**File:** `server/src/analytics/ga4-analytics.service.ts`

```typescript
dimensions: [
  { name: 'eventName' },
  { name: 'pagePath' },
  { name: 'pageTitle' },
  { name: 'customEvent:error_message' }, // ✅ Already added
  { name: 'customEvent:error_type' },    // ✅ Already added
],
```

This is **already done** in the latest code!

---

### 5. Common JavaScript Errors and How to Fix Them

#### TypeError: Cannot read property 'X' of undefined

**Cause:** Trying to access property on undefined/null object

**Fix:**

```typescript
// ❌ Bad
user.name;

// ✅ Good
user?.name;

// ✅ Better
if (user && user.name) {
  // use user.name
}
```

#### ReferenceError: X is not defined

**Cause:** Using variable that doesn't exist

**Fix:**

- Check import statements
- Check variable spelling
- Make sure variable is declared before use

#### SyntaxError

**Cause:** Invalid JavaScript syntax

**Fix:**

- Check for missing brackets, parentheses, commas
- Run ESLint: `npm run lint`
- Check build output for errors

#### Network Error / API Error

**Cause:** Failed API call

**Fix:**

```typescript
try {
  const response = await fetch("/api/endpoint");
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  trackError("api_error", error.message, error.stack);
}
```

---

### 6. View Errors in Dashboard

Once custom dimensions are set up:

1. Open **Analytics Dashboard**
2. Click **Errors & Performance** section
3. Select **General Status** tab
4. You should now see:
   - ✅ Detailed error messages (not just "JS Error")
   - ✅ Error types (TypeError, ReferenceError, etc.)
   - ✅ Stack traces
   - ✅ Affected pages

---

### 7. Advanced: Set Up Alerts

Set up Slack/Email alerts for critical errors:

1. Go to GA4 → **Admin** → **Alerts**
2. Create alert:
   - **Condition:** Event count > threshold
   - **Event:** `error_occurred`
   - **Threshold:** 10 errors in 1 hour
   - **Notification:** Email/Slack webhook

---

## Summary

✅ **Done:**

- Backend updated to read `error_message` and `error_type` from GA4
- Frontend already sends detailed error data
- Error types automatically detected (TypeError, ReferenceError, etc.)

⏳ **To Do (by Admin):**

- Register custom dimensions in GA4 Admin panel
- Wait 24-48 hours for data to appear
- Verify in DebugView

🎯 **Result:**
Instead of seeing "JS Error", you'll see:

- "TypeError: Cannot read property 'map' of undefined"
- "ReferenceError: gtag is not defined"
- "Network Error: Failed to fetch /api/products"

---

## Need Help?

If errors persist after GA4 setup:

1. Check browser console (F12) for actual errors
2. Check GA4 DebugView to verify events are being sent
3. Verify custom dimensions are created correctly in GA4
4. Wait 24-48 hours after creating dimensions
