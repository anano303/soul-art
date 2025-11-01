# User Path Tracking - Implementation Guide

## ✅ What's Implemented

Sequential user journey tracking is now fully implemented! The system tracks every page a user visits in order and sends this data to Google Analytics 4.

## 🎯 How It Works

### 1. **Automatic Page Tracking**
- Every time a user navigates to a new page, it's automatically tracked
- Path is stored in browser's sessionStorage
- Full journey is sent to GA4 as a `user_path` event

### 2. **Example Journey**
If a user visits these pages in order:
1. Homepage: `/`
2. Shop: `/shop`
3. Product: `/products/abc123`
4. Cart: `/cart`
5. Checkout: `/checkout`

The system sends:
```
Event: user_path
Path: / → /shop → /products/abc123 → /cart → /checkout
Path Length: 5
Entry Page: /
Current Page: /checkout
Session ID: unique-session-id
```

## 🔍 How to Verify It's Working

### Method 1: Console Logs (Immediate)
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate through your site: homepage → shop → product → cart
4. Look for logs like:
   ```
   [GA4] User path: / → /shop → /products/123
   [GA4] Event sent: user_path with data: {...}
   ```

### Method 2: Network Tab (Immediate)
1. Open Developer Tools → Network tab
2. Filter by "collect" or "analytics"
3. Navigate through pages
4. Click on the GA4 requests
5. Look in the payload for:
   - `en=user_path` (event name)
   - `ep.path=/ → /shop → /products/123` (the journey)
   - `ep.path_length=3` (number of pages)

### Method 3: GA4 Real-time Reports (Within 30 seconds)
1. Go to GA4: https://analytics.google.com/
2. Select your property (Soul Art - 511283256)
3. Click "Reports" → "Real-time"
4. Navigate through your site
5. In Real-time, click "Event count by Event name"
6. Look for `user_path` events appearing

### Method 4: GA4 DebugView (Best for detailed testing)
1. Install GA Debugger Chrome Extension
2. Enable it (icon turns blue)
3. Navigate through your site
4. In GA4, go to "Configure" → "DebugView"
5. Select your device
6. See each `user_path` event with full parameters:
   - `path`: The sequential journey
   - `path_length`: Number of pages
   - `session_id`: User's session
   - `current_page`: Where they are now
   - `entry_page`: Where they started

### Method 5: Dashboard (24-48 hours)
1. Wait 24-48 hours for data processing
2. Go to Admin Dashboard → GA4 Analytics
3. Look in "User Journey Paths" section
4. See top paths like:
   ```
   Path                                          Users
   / → /shop → /products/123                     45
   / → /artists/john-doe                         32
   / → /shop → /cart → /checkout                 28
   ```

## 📊 What Data Is Collected

### Event: `user_path`
- **path**: Sequential pages visited (e.g., "/ → /shop → /products/123")
- **path_length**: Number of pages (e.g., 3)
- **session_id**: Unique session identifier
- **current_page**: Current page path
- **entry_page**: First page in journey
- **previous_page**: Previous page visited
- **step_number**: Current step in journey (1, 2, 3...)

### Event: `session_end`
- **full_path**: Complete journey when session ends
- **total_pages**: Total pages visited in session
- **session_duration**: Time spent

## 🎨 Dashboard Display

The admin dashboard shows:
- **Top User Paths**: Most common routes users take
- **User Count**: How many users followed each path
- **Format**: Clean arrows between pages (/ → /shop → /products/*)

Example display:
```
Top User Journey Paths
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Path                                    Users   Avg Time
/ → /shop → /products/123               45      2m 15s
/ → /artists/john-doe                   32      1m 45s
/ → /shop → /cart → /checkout           28      3m 30s
/ → /shop → /products/456 → /cart       22      2m 50s
```

## 🧪 Testing Checklist

- [ ] **Console logs show path updates**
  - Open console, navigate through site
  - See `[GA4] User path: / → /shop → /products/123`

- [ ] **Network tab shows events being sent**
  - Filter for "collect"
  - See `en=user_path` in payload

- [ ] **Real-time reports show user_path events**
  - Within 30 seconds of navigation
  - Check GA4 Real-time → Event count

- [ ] **DebugView shows detailed events**
  - Install GA Debugger extension
  - See events with all parameters

- [ ] **SessionStorage contains path**
  - Open DevTools → Application → Session Storage
  - See keys: `ga4_session_id`, `ga4_user_path`
  - `ga4_user_path` should be array like `["/", "/shop", "/products/123"]`

- [ ] **Dashboard displays paths (after 24-48h)**
  - Check User Journey Paths section
  - See aggregated popular paths

## 🚀 Common User Paths to Expect

Based on typical e-commerce behavior:

1. **Discovery Path**
   ```
   / → /shop → /products/[id]
   ```

2. **Artist Focus Path**
   ```
   / → /artists/[username] → /products/[id]
   ```

3. **Category Browse Path**
   ```
   / → /categories/[category] → /products/[id]
   ```

4. **Purchase Path**
   ```
   / → /shop → /products/[id] → /cart → /checkout
   ```

5. **Return Visitor Path**
   ```
   / → /auth/login → /shop → /cart → /checkout
   ```

## 🔧 Technical Details

### Files Modified

1. **`/web/src/lib/ga4-analytics.ts`**
   - Added `trackPageViewWithPath()` function
   - Stores path in sessionStorage as array
   - Sends `user_path` event with formatted string

2. **`/web/src/components/page-view-tracker.tsx`** (NEW)
   - Automatic page view tracking component
   - Triggers on every route change
   - Uses Next.js `usePathname()` hook

3. **`/web/src/app/layout.tsx`**
   - Added `<PageViewTracker />` component
   - Runs on every page in the app

4. **`/server/src/analytics/ga4-analytics.service.ts`**
   - Updated `getUserJourneys()` method
   - Fetches `user_path` events from GA4
   - Aggregates by frequency
   - Shows top 10 paths in dashboard

### Session Storage Keys

- `ga4_session_id`: Unique session identifier (UUID)
- `ga4_user_path`: Array of page paths `["/", "/shop", "/products/123"]`

### Event Format

```javascript
{
  event: 'user_path',
  session_id: 'abc-123-def-456',
  path: '/ → /shop → /products/123',
  path_length: 3,
  current_page: '/products/123',
  entry_page: '/',
  previous_page: '/shop',
  step_number: 3
}
```

## ⚡ Performance

- **Lightweight**: Only stores paths in sessionStorage (< 1KB)
- **Non-blocking**: Events sent asynchronously
- **No duplicates**: Path only updates on actual route changes
- **Session-based**: Clears when user closes browser

## 📈 Analytics Insights

This tracking enables you to answer:

1. **What's the most common path to purchase?**
   - See which routes lead to checkout

2. **Where do users drop off?**
   - Identify pages where journeys end

3. **Do users browse before buying?**
   - See if they visit multiple products

4. **Are artists driving traffic?**
   - Track paths through artist profiles

5. **Is search effective?**
   - See if search leads to products/purchases

## 🎯 Next Steps

1. **Test the tracking** (Today)
   - Navigate through your site
   - Check console logs
   - Verify in Network tab

2. **Check Real-time** (Within 30 seconds)
   - See events appearing in GA4

3. **Wait for dashboard data** (24-48 hours)
   - Check User Journey Paths section
   - Analyze top paths

4. **Optimize based on data** (Ongoing)
   - Improve paths with high drop-off
   - Promote successful conversion paths
   - Adjust navigation based on behavior

## 🐛 Troubleshooting

**Q: I don't see console logs**
- Check that you're in development mode
- Look for `[GA4]` prefix in console
- Try navigating to a new page

**Q: SessionStorage is empty**
- Check DevTools → Application → Session Storage
- Navigate to a page to trigger tracking
- Look for keys starting with `ga4_`

**Q: Events not in Real-time**
- Wait up to 30 seconds
- Make sure GA Measurement ID is correct
- Check browser console for errors

**Q: Dashboard shows no paths**
- This is normal for first 24-48 hours
- GA4 Data API has processing delay
- Events ARE working if you see them in Real-time

**Q: Paths look weird (multiple slashes, etc.)**
- This is normal for dynamic routes
- Backend will normalize/group similar paths
- E.g., `/products/123` and `/products/456` can be shown as `/products/*`

## ✨ Success Indicators

You'll know it's working when:
- ✅ Console shows: `[GA4] User path: / → /shop`
- ✅ Network tab shows events with `en=user_path`
- ✅ Real-time shows `user_path` events
- ✅ SessionStorage has `ga4_user_path` array
- ✅ DebugView shows full event details
- ✅ Dashboard displays paths (after 24-48h)

---

**🎉 User path tracking is live! Navigate through your site and watch the magic happen.**
