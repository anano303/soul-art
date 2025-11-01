# GA4 Event Tracking - Testing & Verification Guide

## 🔍 Why the Dashboard Shows 0s

**Important:** The GA4 dashboard currently shows sample data or 0s because:

1. **GA4 Data API has a 24-48 hour delay** - Real data from the GA4 Data API is NOT real-time
2. **GA4 credentials may not be configured** - The backend needs GA4 service account credentials to fetch data
3. **Events ARE being tracked** - They're being sent to GA4, but won't appear in the dashboard immediately

## ✅ How to Verify Events Are Working (Real-time)

### Method 1: Browser Console (Easiest)

1. **Open Browser Console**
   - Chrome: `Cmd + Option + J` (Mac) or `Ctrl + Shift + J` (Windows)
   - Firefox: `Cmd + Option + K` (Mac) or `Ctrl + Shift + K` (Windows)

2. **Perform Actions on Your Site**
   - Add items to cart
   - View cart
   - Go to checkout
   - Click products
   - Search for items

3. **Look for Console Messages**
   ```
   [GA4] Event sent: add_to_cart {productId: "123", price: 50, quantity: 1}
   [GA4] Event sent: view_cart {cartTotal: 100, itemCount: 2}
   [GA4] Event sent: begin_checkout {cartTotal: 100, items: Array(2)}
   ```

4. **If You See These Messages**: ✅ Events are being sent successfully!

5. **If You See Warnings**:
   ```
   [GA4] gtag not loaded, event not sent: add_to_cart
   ```
   This means GA4 script didn't load - check your measurement ID.

### Method 2: GA4 Real-time Reports (Most Accurate)

1. **Go to Google Analytics 4**
   - Visit: https://analytics.google.com
   - Select your property

2. **Open Real-time Report**
   - Left sidebar → Reports → Real-time
   - Or direct link: Reports → Engagement → Real-time

3. **Perform Actions**
   - While watching the real-time report
   - Add to cart, checkout, etc.

4. **What to Look For**
   - Active users should increase
   - Events should appear in "Event count by Event name"
   - You should see events like:
     - `add_to_cart`
     - `view_cart`
     - `begin_checkout`
     - `funnel_add_to_cart`
     - `purchase_funnel_progress`

5. **Timeline**: Events appear within **seconds** in real-time reports!

### Method 3: GA4 DebugView (Advanced)

1. **Install GA Debugger Extension**
   - Chrome: [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

2. **Enable Debug Mode**
   - Click the extension icon
   - Reload your site

3. **Open GA4 DebugView**
   - GA4 → Admin → DebugView
   - Or: Configure → DebugView

4. **See Detailed Event Data**
   - All events with full parameters
   - User properties
   - Session info

## 📊 Understanding the Purchase Funnel

### Your 8-Step Funnel

1. **Add to Cart** - `funnel_add_to_cart`
2. **View Cart** - `funnel_view_cart`
3. **Begin Checkout** - `funnel_begin_checkout`
4. **Checkout Login** - `funnel_checkout_login` (only if user logs in during checkout)
5. **Add Shipping Info** - `funnel_add_shipping_info`
6. **View Summary** - `funnel_view_summary`
7. **Click Purchase** - `funnel_click_purchase`
8. **Purchase Complete** - `funnel_purchase_complete`

### Expected Console Output (Full Purchase Flow)

```javascript
// Step 1
[GA4] Event sent: add_to_cart {productId: "...", productName: "...", price: 50, quantity: 1}
[GA4] Event sent: funnel_add_to_cart {productId: "...", productName: "...", price: 50, quantity: 1}

// Step 2
[GA4] Event sent: view_cart {cartTotal: 50, itemCount: 1}
[GA4] Event sent: funnel_view_cart {cartTotal: 50, itemCount: 1}

// Step 3
[GA4] Event sent: begin_checkout {cartTotal: 50, itemCount: 1, items: [...]}
[GA4] Event sent: funnel_begin_checkout {cartTotal: 50, itemCount: 1, items: [...]}

// Step 4 (only if logging in during checkout)
[GA4] Event sent: checkout_login {is_new_user: false, login_context: "checkout"}
[GA4] Event sent: funnel_checkout_login {is_new_user: false, login_context: "checkout"}

// Step 5
[GA4] Event sent: add_shipping_info {}
[GA4] Event sent: funnel_add_shipping_info {}

// Step 6
[GA4] Event sent: view_summary {orderTotal: 50}
[GA4] Event sent: funnel_view_summary {orderTotal: 50}

// Step 7
[GA4] Event sent: click_purchase {orderTotal: 50}
[GA4] Event sent: funnel_click_purchase {orderTotal: 50}

// Step 8
[GA4] Event sent: purchase {transaction_id: "...", value: 50, currency: "GEL", items: [...]}
[GA4] Event sent: purchase_complete {orderId: "...", orderTotal: 50, items: [...]}
[GA4] Event sent: funnel_purchase_complete {orderId: "...", orderTotal: 50, items: [...]}
```

## 🛠️ Troubleshooting

### Events Not Showing in Console?

**Check 1: GA4 Script Loaded?**
```javascript
// Run in console:
typeof window.gtag
// Should return: "function"
// If "undefined" → Script didn't load
```

**Check 2: Measurement ID Set?**
```javascript
// Check in console:
console.log(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
// Should show: "G-Q70MY6FWYL"
```

**Check 3: Network Tab**
- Open Network tab in DevTools
- Filter by "collect"
- Look for requests to `google-analytics.com/collect` or `google-analytics.com/g/collect`
- These are GA4 events being sent

### Events in Console But Not in GA4?

**Possible Reasons:**
1. **Wrong Measurement ID** - Double check it matches your GA4 property
2. **GA4 Property Not Set Up** - Ensure you have a GA4 property, not old Universal Analytics
3. **Data Filters** - Check if you have filters blocking events
4. **Ad Blockers** - Disable ad blockers for testing

### Dashboard Shows 0s?

**This is NORMAL!** The dashboard uses GA4 Data API which has delays. Options:

1. **Wait 24-48 hours** - Data will appear after processing
2. **Configure GA4 Service Account** - See GA4_SETUP_GUIDE.md
3. **Use GA4 Real-time Reports** - Check events immediately in GA4 UI

## 📈 What You Should See (Timeline)

| Timeframe | What You'll See | Where |
|-----------|----------------|-------|
| **Immediately** | Events in browser console | Browser DevTools Console |
| **Within 10 seconds** | Events in real-time report | GA4 → Reports → Real-time |
| **Within 30 minutes** | Events in DebugView | GA4 → Admin → DebugView |
| **24-48 hours** | Full data in standard reports | GA4 → Reports → All reports |
| **24-48 hours** | Data in Data API (dashboard) | Admin Dashboard |

## ✨ Quick Test Checklist

- [ ] Open browser console (Cmd+Option+J)
- [ ] Add item to cart
- [ ] See `[GA4] Event sent: add_to_cart` in console
- [ ] Go to cart page
- [ ] See `[GA4] Event sent: view_cart` in console
- [ ] Click checkout
- [ ] See `[GA4] Event sent: begin_checkout` in console
- [ ] Open GA4 Real-time report
- [ ] See active user (you) and events

## 🎯 Expected Results

**If you see console logs**: ✅ Tracking is working perfectly!

**If events appear in GA4 Real-time**: ✅ GA4 is receiving data!

**If dashboard shows 0s**: ⏳ Normal! Wait 24-48 hours OR configure GA4 Data API credentials

---

## 🔑 Next Steps

1. **Verify events in console** (right now)
2. **Check GA4 Real-time reports** (within minutes)
3. **Configure GA4 Data API** (see GA4_SETUP_GUIDE.md) - for dashboard data
4. **Wait 24-48 hours** - for historical data in dashboard

Your tracking IS working if you see events in the console! 🎉
