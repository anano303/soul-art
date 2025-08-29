# Security & Performance Utilities Integration Guide

## Overview
This guide explains how to integrate the newly implemented security and performance utilities into the SoulArt application.

## 🔒 Security Middleware Integration

### Backend (NestJS) - COMPLETED ✅

The following security features have been implemented:

#### 1. Rate Limiting
**File**: `/server/src/middleware/security.middleware.ts`

Rate limiting has been applied to:
- **Authentication endpoints** (5 requests/15 minutes):
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/refresh`
  - `POST /auth/forgot-password` 
  - `POST /auth/reset-password`

- **File upload endpoints** (10 uploads/hour):
  - `POST /auth/sellers-register` (logo upload)
  - `POST /users/profile-image`
  - `POST /users/seller-logo`
  - `POST /upload` (general uploads)
  - `POST /banners` (banner images)
  - `POST /forums` (forum attachments)
  - `PUT /forums/:id` (forum updates)

- **Payment endpoints** (20 requests/hour):
  - `POST /payments/bog/create`
  - `POST /payments/bog/callback`

- **General API endpoints** (100 requests/15 minutes) - Applied globally

#### 2. Global Security Headers
Applied in `main.ts`:
- **Helmet.js**: Security headers (XSS protection, content type sniffing prevention, etc.)
- **CORS**: Configured with specific allowed origins for production and development
- **Global rate limiting**: 100 requests per 15 minutes per IP

### Frontend Integration

#### Enhanced Error Handling
**File**: `/web/src/lib/error-handler.ts`

The error handler now includes specific handling for:
- **Rate limiting (429 errors)**: Shows Georgian message about too many requests
- **Network errors**: Connection issues with helpful messages
- **HTTP status codes**: Specific Georgian messages for 400, 401, 403, 404, 409, 500
- **Validation errors**: Handles array of error messages from backend

**Usage Examples**:
```typescript
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/lib/error-handler';

// In a try-catch block
try {
  await apiClient.post('/auth/login', credentials);
  showSuccessToast('ავტორიზაცია წარმატებით დასრულდა');
} catch (error) {
  showErrorToast(error); // Automatically handles rate limiting and other errors
}

// Manual error extraction
const errorMessage = extractErrorMessage(error);
```

#### Cache Implementation
**File**: `/web/src/lib/cache.ts`

Features:
- **LRU Cache**: Automatic cleanup of oldest entries
- **TTL Support**: Time-based expiration
- **Memory management**: Configurable size limits
- **Performance monitoring**: Hit/miss statistics

**Usage Examples**:
```typescript
import { createCache } from '@/lib/cache';

// Create cache for categories (cache for 5 minutes)
const categoriesCache = createCache<Category[]>({ 
  maxSize: 50, 
  ttl: 5 * 60 * 1000 
});

// Use in data fetching
async function getCategories() {
  const cached = categoriesCache.get('categories');
  if (cached) return cached;
  
  const categories = await apiClient.get('/categories');
  categoriesCache.set('categories', categories.data);
  return categories.data;
}
```

## 📊 Performance Optimizations

### Backend Optimizations - COMPLETED ✅

1. **Database Indexes**: Added to product schema for better query performance
2. **Rate limiting**: Prevents abuse and reduces server load
3. **Helmet security**: Reduces attack surface
4. **File upload limits**: 50MB limit configured

### Frontend Optimizations - READY FOR USE

1. **Error boundaries**: Catch React component errors gracefully
2. **Centralized error handling**: Consistent user experience
3. **Caching utilities**: Reduce API calls for static data

## 🚀 Recommended Next Steps

### 1. Implement Caching for Static Data
Apply caching to frequently accessed, rarely changing data:

```typescript
// Categories cache (recommended)
const categoriesCache = createCache<Category[]>({ maxSize: 100, ttl: 5 * 60 * 1000 });

// User profile cache (recommended) 
const userCache = createCache<User>({ maxSize: 50, ttl: 2 * 60 * 1000 });

// Product listings cache (optional - careful with real-time inventory)
const productsCache = createCache<Product[]>({ maxSize: 200, ttl: 1 * 60 * 1000 });
```

### 2. Add Error Boundaries to Key Components

Wrap main app sections:
```tsx
// In layout.tsx or main components
<ErrorBoundary>
  <MainApp />
</ErrorBoundary>
```

### 3. Update API Client Usage
Replace manual error handling with the new utilities:

```typescript
// Before (manual error handling in components)
try {
  const response = await apiClient.post('/auth/login', data);
} catch (error) {
  if (error.response?.status === 429) {
    toast({ title: 'ძალიან ბევრი მოთხოვნა...', variant: 'destructive' });
  }
  // ... more manual handling
}

// After (using error handler)
try {
  const response = await apiClient.post('/auth/login', data);
  showSuccessToast('ავტორიზაცია წარმატებით დასრულდა');
} catch (error) {
  showErrorToast(error); // Handles all error types including rate limiting
}
```

## ⚠️ Important Notes

### Rate Limiting Considerations
1. **Development**: Rate limits are active in all environments
2. **Testing**: Consider temporarily disabling rate limits for automated tests
3. **Production**: Monitor rate limit hits in logs to adjust limits if needed

### Error Messages
- All error messages are in Georgian to match the application's language
- Rate limiting specifically shows: "ძალიან ბევრი მოთხოვნა. გთხოვთ, სცადოთ რამდენიმე წუთის შემდეგ."

### Cache Strategy
- **Categories**: 5-minute cache (rarely change)
- **User profiles**: 2-minute cache (may change during session)
- **Products**: 1-minute cache (inventory may change frequently)

## 🧪 Testing

### Test Rate Limiting
```bash
# Test authentication rate limiting (should block after 5 attempts)
for i in {1..6}; do curl -X POST http://localhost:4000/auth/login -d '{"email":"test","password":"test"}' -H "Content-Type: application/json"; done

# Test general API rate limiting (should block after 100 requests)
for i in {1..101}; do curl http://localhost:4000/categories; done
```

### Test Error Handling
```typescript
// Test in browser console
try {
  throw new Error('Test error');
} catch (error) {
  showErrorToast(error);
}
```

## 🔧 Configuration

### Adjusting Rate Limits
Edit `/server/src/middleware/security.middleware.ts`:

```typescript
// Authentication: 5 requests per 15 minutes (current)
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // max 5 requests
  'Too many authentication attempts...'
);

// Upload: 10 uploads per hour (current)
export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // max 10 uploads
  'Too many upload attempts...'
);
```

### Cache Configuration
Edit `/web/src/lib/cache.ts` constructor options:

```typescript
// Larger cache for more data
const cache = createCache({ maxSize: 500, ttl: 10 * 60 * 1000 });

// Shorter TTL for frequently changing data
const cache = createCache({ maxSize: 100, ttl: 30 * 1000 });
```

## 📈 Monitoring

### Backend Logs
Rate limiting events are automatically logged by express-rate-limit. Monitor for:
- High number of 429 responses
- Suspicious IP addresses making many requests

### Frontend Monitoring
The cache utility provides statistics:
```typescript
const stats = cache.getStats();
console.log('Cache hit rate:', stats.hits / (stats.hits + stats.misses));
```

## 🎯 Launch Readiness

With these security and performance improvements:

✅ **Security**: Rate limiting prevents abuse  
✅ **Performance**: Caching reduces API load  
✅ **Error handling**: Better user experience  
✅ **TypeScript**: Strict mode for better code quality  
✅ **Database**: Optimized indexes for faster queries  

The application is now significantly more robust for production launch.
