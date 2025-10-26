# 🛒 Streamlined Checkout Guide

## Overview

The new streamlined checkout provides a **multi-step checkout experience** with a persistent sidebar showing the order summary. The BOG payment is attempted to be embedded in a modal for a seamless experience, with a fallback to a popup window.

---

## 🎯 Key Features

### 1. **Multi-Step Layout**
- **Left Content Area**: Shows current checkout step
- **Right Sidebar**: Sticky order summary (always visible)
- **Step Indicator**: Visual progress bar at the top

### 2. **Checkout Steps**
1. **Authentication** - User must be logged in
2. **Shipping** - Enter delivery address
3. **Payment** - Select payment method (BOG by default)
4. **Review** - Review order and place order

### 3. **BOG Payment Integration**

#### Modal Approach (Primary)
- When user clicks "შეკვეთის გაფორმება", the system:
  1. Creates the order in the backend
  2. Requests BOG payment URL
  3. Opens payment URL in a modal overlay with iframe
  4. Also opens in popup window as fallback
  5. Listens for `postMessage` from success/fail pages

#### Popup Fallback
- If iframe is blocked by BOG's `X-Frame-Options`, the popup window remains open
- User completes payment in the popup
- Success/fail pages communicate back to main window via `postMessage`

### 4. **Auto-Navigation**
- Steps advance automatically when completed
- BOG is set as default payment method
- Form data persists in `localStorage`

---

## 📁 File Structure

```
web/src/
├── modules/checkout/components/
│   ├── streamlined-checkout.tsx       # Main component
│   ├── streamlined-checkout.css       # Styles
│   ├── shipping-form.tsx              # Reused shipping form
│   └── ...
├── app/(pages)/checkout/
│   ├── streamlined/page.tsx           # New checkout page
│   ├── success/page.tsx               # Payment success (updated with postMessage)
│   └── fail/page.tsx                  # Payment failure (updated with postMessage)
```

---

## 🔄 Payment Flow

### User Journey

```
Cart → Click Checkout
  ↓
Streamlined Checkout (/checkout/streamlined)
  ↓
Step 1: Login (if not authenticated)
  ↓
Step 2: Enter Shipping Address
  ↓
Step 3: Select Payment Method (BOG auto-selected)
  ↓
Step 4: Review Order
  ↓
Click "შეკვეთის გაფორმება"
  ↓
Backend creates order & gets BOG payment URL
  ↓
Two scenarios happen simultaneously:
  1. Modal with iframe opens (primary)
  2. Popup window opens (fallback)
  ↓
User completes payment in BOG page
  ↓
BOG redirects to success/fail page
  ↓
Success/fail page sends postMessage to parent
  ↓
Modal/popup closes, user redirected to order page
```

### Technical Flow

```javascript
// 1. User clicks "Place Order"
handlePlaceOrder() {
  validateStock()
  createOrder()
  if (paymentMethod === 'BOG') {
    handleBOGPayment(orderId, amount)
  }
}

// 2. BOG Payment Handler
handleBOGPayment() {
  // Create payment request
  const response = await POST('/payments/bog/create', paymentData)
  
  // Open in modal
  setPaymentUrl(response.redirect_url)
  setShowPaymentModal(true)
  
  // Also open popup (fallback)
  const popup = window.open(redirect_url, 'BOGPayment', ...)
  
  // Listen for completion
  window.addEventListener('message', (event) => {
    if (event.data.type === 'payment_success') {
      clearCart()
      router.push('/checkout/success')
      closeModal()
      closePopup()
    }
  })
}

// 3. Success/Fail pages send message back
useEffect(() => {
  if (window.opener || window.parent !== window) {
    window.parent.postMessage({ type: 'payment_success', orderId }, origin)
    window.opener.postMessage({ type: 'payment_success', orderId }, origin)
  }
}, [])
```

---

## 🎨 UI/UX Highlights

### Step Indicator
- **Completed Steps**: Green circle with checkmark ✓
- **Active Step**: Blue circle with number
- **Pending Steps**: Gray circle with number
- **Connected Line**: Shows progress flow

### Order Summary Sidebar
- **Sticky positioning**: Stays visible while scrolling
- **Product thumbnails**: First 3 items shown
- **Compact totals**: Items, delivery, commission, total
- **Responsive**: Moves to top on mobile

### Payment Modal
- **Clean overlay**: Dark background (70% opacity)
- **Centered modal**: 600px wide, 90vh tall
- **Close button**: Top-right corner
- **Fallback link**: "Click here if payment page doesn't open"
- **iframe sandbox**: Secure attributes set

---

## 🔧 Configuration

### Payment URLs
Located in `streamlined-checkout.tsx`:

```typescript
successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`
failUrl: `${window.location.origin}/checkout/fail?orderId=${orderId}`
```

### Modal Settings
```typescript
// Popup window dimensions
width=600, height=700, scrollbars=yes

// iframe sandbox attributes
"allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
```

---

## 🚨 Important Notes

### BOG iframe Limitations
⚠️ **If BOG sets `X-Frame-Options: DENY` or `SAMEORIGIN`:**
- The iframe will **fail to load**
- User will see blank iframe
- **Fallback**: The popup window remains open and functional

**Solution**: The component opens **both** modal and popup simultaneously. If iframe fails, user can continue in popup.

### Security Considerations
- `postMessage` only accepts messages from same origin
- iframe has sandbox attributes for security
- Payment data never stored client-side
- All payment processing on BOG's secure servers

### Browser Compatibility
- **Modal**: Works in all modern browsers
- **iframe**: May be blocked by BOG (server-side setting)
- **Popup**: May be blocked by popup blockers (user must allow)
- **postMessage**: Supported in all browsers

---

## 📱 Responsive Behavior

### Desktop (>1024px)
- Two-column layout
- Sidebar fixed on right
- Full step indicator

### Tablet (768px - 1024px)
- Single column
- Sidebar moves to top
- Full step indicator

### Mobile (<768px)
- Single column
- Compact sidebar
- Smaller step circles
- Abbreviated labels

---

## 🔄 Future Improvements

### 1. **Saved Addresses** (Recommended)
Add to user schema:
```typescript
savedAddresses: [{
  label: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}]
```

Benefits:
- One-click address selection
- Faster checkout for returning customers
- Address management in profile

### 2. **Guest Checkout**
- Allow checkout without login
- Email-based order tracking
- Optional account creation after purchase

### 3. **Multiple Payment Methods**
- Enable PayPal for international customers
- Enable Stripe for card payments
- Auto-suggest based on country

### 4. **Progress Persistence**
- Save incomplete checkouts to database
- Email reminders for abandoned carts
- Resume checkout from any device

### 5. **Enhanced BOG Integration**
If BOG provides API for iframe embedding:
- Remove popup fallback
- Better error handling
- Real-time payment status in modal

---

## 🧪 Testing Checklist

- [ ] Login flow works
- [ ] Shipping form validates properly
- [ ] Payment method selection
- [ ] Order review shows correct data
- [ ] Stock validation prevents overselling
- [ ] BOG modal opens
- [ ] BOG popup opens as fallback
- [ ] Success page sends postMessage
- [ ] Fail page sends postMessage
- [ ] Cart clears after successful payment
- [ ] Order appears in user's order history
- [ ] Responsive on mobile devices
- [ ] Works with popup blockers enabled/disabled
- [ ] Handles BOG iframe blocking gracefully

---

## 🐛 Troubleshooting

### Issue: Modal shows blank iframe
**Cause**: BOG blocks iframe embedding via `X-Frame-Options`
**Solution**: User can continue in the popup window that opened simultaneously

### Issue: Popup blocked by browser
**Cause**: Browser popup blocker
**Solution**: 
1. Show user a message to allow popups
2. Provide manual link to payment URL
3. User can click "Click here" link in modal footer

### Issue: Payment success but modal doesn't close
**Cause**: `postMessage` not received
**Solution**:
1. Check browser console for CORS errors
2. Verify success page sends message
3. User can manually close modal and refresh

### Issue: Order created but payment not completed
**Cause**: User closed modal/popup before completing payment
**Solution**: Order remains in "pending" status, user can retry payment from order page

---

## 📞 Support

For issues or questions about the streamlined checkout:
1. Check browser console for errors
2. Verify BOG API credentials in `.env`
3. Test in different browsers
4. Review payment logs in backend

---

## 🎉 Summary

The streamlined checkout provides:
✅ Clean multi-step process
✅ Persistent order summary
✅ Seamless BOG payment integration (with fallback)
✅ Auto-advancing steps
✅ Mobile-responsive design
✅ Stock validation
✅ Real-time updates

**Access**: `/checkout/streamlined`
