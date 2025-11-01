# GA4 Event Tracking - Debugging Checklist

## ✅ Step-by-Step Verification

### Step 1: Verify Console Logs (Already Done ✓)
You mentioned you see `[GA4] Event sent` in console - **This is good!** It means:
- ✅ gtag is loaded
- ✅ Events are being triggered
- ✅ Code is working

### Step 2: Check Network Traffic

1. **Open Chrome DevTools** → Network tab
2. **Filter by**: `collect` or `analytics`
3. **Perform an action** (add to cart)
4. **Look for requests to**:
   - `www.google-analytics.com/g/collect`
   - `www.google-analytics.com/collect`

**What to check:**
- Status should be `200 OK` (or `204 No Content`)
- Look at Query String Parameters:
  - `v=2` (GA4 version)
  - `tid=G-Q70MY6FWYL` (your measurement ID)
  - `en=funnel_add_to_cart` (event name)

**If you DON'T see these requests:**
- Ad blocker is blocking them
- Browser privacy settings are blocking analytics
- Network issue

**Action:** Disable ad blockers and try again!

### Step 3: GA4 Real-time Report - WHERE TO LOOK

⚠️ **IMPORTANT:** Don't look at the old "Reports" section!

**Correct Location:**
1. Go to https://analytics.google.com
2. Select property: **G-Q70MY6FWYL**
3. Click **Reports** (left sidebar)
4. Click **Realtime** (should be at the top)

**What you should see:**
- **Users in last 30 minutes**: Should show 1+ (you)
- **Event count by Event name**: Scroll down to see event list
- Look for events like:
  - `funnel_add_to_cart`
  - `funnel_view_cart`
  - `funnel_begin_checkout`
  - `page_view`

**Timeline:** Events appear within **5-10 seconds**

### Step 4: Check GA4 DebugView (Most Detailed)

1. **Install Extension:**
   - Chrome: [GA Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

2. **Enable Debug Mode:**
   - Click extension icon (should turn blue/green)
   - Reload your website

3. **Open DebugView:**
   - GA4 → Admin (gear icon) → DebugView
   - OR: Configure → DebugView

4. **Perform Actions:**
   - Add item to cart
   - View cart
   - Start checkout

5. **See Events:**
   - Each event appears with full parameter details
   - Shows exactly what GA4 received

### Step 5: Common Issues & Solutions

#### Issue 1: "I see console logs but no events in GA4"

**Possible causes:**
1. **Wrong GA4 Property**
   - Make sure you're viewing property `G-Q70MY6FWYL`
   - Check if you have multiple properties

2. **Ad Blocker**
   - Disable ALL ad blockers
   - Try incognito/private mode
   - Check browser extensions

3. **Privacy Settings**
   - Brave browser blocks analytics by default
   - Firefox Enhanced Tracking Protection
   - Safari Intelligent Tracking Prevention

4. **Wrong Measurement ID**
   - Verify in browser console: 
   ```javascript
   console.log(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
   // Should show: G-Q70MY6FWYL
   ```

5. **Events Not Sent to Network**
   - Check Network tab for `collect` requests
   - If missing → blocked by browser/extension

#### Issue 2: "Network requests fail (red/blocked)"

**Solution:**
- Disable ad blockers (uBlock Origin, AdBlock Plus, etc.)
- Disable privacy extensions (Privacy Badger, Ghostery, etc.)
- Try different browser
- Try incognito mode

#### Issue 3: "Events in Real-time but not in dashboard"

**This is NORMAL!**
- Real-time: Instant (seconds)
- Standard reports: 24-48 hours delay
- Data API (our dashboard): 24-48 hours delay

### Step 6: Manual Test Script

Open browser console and run this:

```javascript
// Test if gtag is available
console.log('gtag available:', typeof gtag !== 'undefined');

// Send test event
if (typeof gtag !== 'undefined') {
  gtag('event', 'test_event', {
    test_parameter: 'manual_test',
    timestamp: new Date().toISOString()
  });
  console.log('Test event sent!');
} else {
  console.error('gtag not available!');
}

// Check dataLayer
console.log('dataLayer:', window.dataLayer);
console.log('dataLayer length:', window.dataLayer?.length);
```

**Then check:**
1. Network tab for `collect` request
2. GA4 Real-time for `test_event`

### Step 7: Verify Measurement ID in GA4

1. Go to GA4 → Admin → Data Streams
2. Click on your web stream
3. **Check "Measurement ID"** = `G-Q70MY6FWYL`
4. **Status should be:** "Receiving data recently" (green checkmark)

If it says "Not receiving data" → There's a blocking issue

### Step 8: Check for Multiple GA4 Instances

Run in console:
```javascript
// Check how many times GA4 was initialized
console.log('dataLayer calls:', window.dataLayer.filter(item => 
  item[0] === 'config' || item[0] === 'js'
));
```

Should show 1-2 config calls. If more → Multiple instances (can cause issues)

## 🔍 Expected Console Output

When working correctly, you should see:

```
[GA4] Google Analytics script loaded successfully
[GA4] Initialized with measurement ID: G-Q70MY6FWYL
[GA4] Event sent: funnel_add_to_cart {productId: "123", ...}
[GA4] dataLayer length: 5
```

## 🎯 Quick Diagnostic

Run this in console:

```javascript
// Complete diagnostic
const diagnostic = {
  gtagAvailable: typeof gtag !== 'undefined',
  dataLayerAvailable: typeof window.dataLayer !== 'undefined',
  dataLayerLength: window.dataLayer?.length || 0,
  measurementId: 'G-Q70MY6FWYL',
  lastEvents: window.dataLayer?.slice(-5) || []
};

console.table(diagnostic);
console.log('Last 5 dataLayer entries:', diagnostic.lastEvents);
```

## ✅ Success Indicators

You know it's working when:
- ✅ Console shows: `[GA4] Event sent`
- ✅ Network tab shows: `collect` requests with 200 status
- ✅ GA4 Real-time shows: Active users and events
- ✅ DebugView shows: Events with parameters

## 🆘 Still Not Working?

1. **Try Different Browser** (Chrome recommended)
2. **Disable ALL Extensions** temporarily
3. **Check GA4 Property Settings:**
   - Enhanced measurement ON
   - Data collection ON
   - No IP filters blocking you

4. **Verify Service Account** (for dashboard data):
   - Has Analytics Viewer role
   - Property ID is correct (511283256)

5. **Check Server Logs:**
   ```bash
   # In server directory
   npm run dev
   # Look for GA4 initialization messages
   ```

## 📞 Next Steps

If you've done all the above and still see nothing in GA4 Real-time:

1. Share screenshot of:
   - Console logs
   - Network tab (filtered by 'collect')
   - GA4 Real-time page

2. Try the manual test script above

3. Check if you're viewing the correct property in GA4

The issue is almost always:
- Ad blocker
- Wrong GA4 property being viewed
- Privacy browser settings
- Looking at wrong report section (not Real-time)
