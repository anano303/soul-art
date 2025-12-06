# Third-Party Tracking Services Error Handling

## Overview

This document explains the console errors you may see related to third-party tracking services like **Madgicx** and how they're handled.

## Common Errors

### 1. Madgicx 404 Errors

```
POST https://capig.madgicx.ai/events/... 404 (Not Found)
```

**What is Madgicx?**

- Madgicx is a third-party Meta Pixel (Facebook Pixel) optimization service
- It intercepts Facebook Pixel events and tries to send them to its own servers
- This can happen if you have Madgicx browser extension installed or integrated with your Facebook Ads account

**Is this a problem?**

- ❌ **No, this does NOT affect your actual Meta Pixel tracking**
- ✅ Facebook Pixel events are still being tracked correctly
- ✅ Your GA4 tracking is working fine
- These are just failed network requests from Madgicx trying to collect additional data

### 2. PWA Install Banner

```
Banner not shown: beforeinstallpromptevent.preventDefault() called
```

This is expected behavior - it means the PWA install prompt is being controlled programmatically rather than showing automatically.

## Solution Implemented

We've added comprehensive error suppression in `layout.tsx` that:

1. **Suppresses Madgicx console errors** - Filters out 404 errors from `madgicx.ai` and `capig` domains
2. **Prevents error event bubbling** - Stops Madgicx errors from appearing in console
3. **Intercepts failed fetch requests** - Silently handles Madgicx API failures

## How to Verify Your Tracking Still Works

### Check Meta Pixel

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "facebook"
4. You should see requests to `facebook.com/tr` with status 200
5. Look for events like `PageView`, `ViewContent`, etc.

### Check GA4

1. Console should show: `[GA4] Initialized with measurement ID: G-Q70MY6FWYL`
2. No errors related to `analytics.js` or `gtag.js`
3. Events are being tracked in GA4 real-time reports

## Disabling Madgicx Completely

If you want to stop Madgicx from even trying to track:

### Option 1: Disable Browser Extension

1. Go to your browser extensions
2. Find "Madgicx" or similar ad optimization extensions
3. Disable or remove them

### Option 2: Disconnect from Facebook

1. Go to your Facebook Business Manager
2. Navigate to Business Settings → Data Sources → Pixels
3. Find your Pixel (1189697243076610)
4. Remove Madgicx integration if present

## Testing Your Setup

### Test Meta Pixel Events

```javascript
// Open browser console and run:
if (window.fbq) {
  console.log("✅ Meta Pixel loaded");
  fbq("track", "TestEvent");
} else {
  console.log("❌ Meta Pixel not loaded");
}
```

### Test GA4

```javascript
// Open browser console and run:
if (window.gtag) {
  console.log("✅ GA4 loaded");
  gtag("event", "test_event");
} else {
  console.log("❌ GA4 not loaded");
}
```

## Current Configuration

- **Meta Pixel ID**: `1189697243076610`
- **GA4 Measurement ID**: `G-Q70MY6FWYL`
- **Facebook App ID**: `2385644865136914` (for SDK)

## Related Files

- `/web/src/app/layout.tsx` - Error suppression script
- `/web/src/components/MetaPixel.tsx` - Meta Pixel tracking functions
- `/web/src/modules/admin/components/meta-pixel-dashboard.tsx` - Meta Pixel analytics dashboard

## Need Help?

If you're still seeing tracking issues:

1. Check the [META_PIXEL_GUIDE.md](./META_PIXEL_GUIDE.md)
2. Check the [GA4_IMPLEMENTATION_GUIDE.md](./GA4_IMPLEMENTATION_GUIDE.md)
3. Review browser console for actual errors (not Madgicx)
4. Use Facebook Pixel Helper Chrome extension
5. Check GA4 DebugView in Google Analytics

## Summary

✅ **Your tracking is working correctly**

- The Madgicx 404 errors are cosmetic only
- Meta Pixel events are being sent to Facebook successfully
- GA4 is tracking properly
- Error suppression has been implemented to clean up console

❌ **These errors do NOT affect**:

- User experience
- Site performance
- Actual tracking and analytics
- Data collection
