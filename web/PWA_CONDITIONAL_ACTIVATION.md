# PWA Conditional Activation - Implementation Summary

## Overview

Modified the PWA (Progressive Web App) configuration to activate only when the app is installed and running on mobile devices, not when accessing through regular browser.

## Changes Made

### 1. Next.js Configuration (`next.config.ts`)

- **Changed**: Disabled automatic PWA registration (`register: false`)
- **Changed**: Disabled auto service worker activation (`skipWaiting: false`)
- **Fixed**: Disabled PWA completely in development mode to prevent Workbox warnings
- **Added**: Conditional service worker generation settings

### 2. PWA Detection Utilities (`/src/utils/pwa.ts`)

- **Created**: Comprehensive detection functions for:
  - `isRunningAsInstalledPWA()` - Detects if app is running as installed PWA
  - `isMobileDevice()` - Detects mobile devices
  - `registerServiceWorkerConditionally()` - Registers SW only when conditions are met
  - `unregisterServiceWorkerIfNeeded()` - Cleans up SW when not needed
  - `initializePWA()` - Main initialization function

### 3. PWA Manager Component (`/src/components/pwa-manager.tsx`)

- **Created**: Client-side component that handles conditional PWA initialization
- **Features**: Development mode debugging, automatic initialization on load

### 4. Layout Updates (`/src/app/layout.tsx`)

- **Replaced**: Basic SW registration script with conditional logic
- **Added**: Mobile detection, installation status detection
- **Added**: PWA Manager component
- **Added**: Display mode change listeners

### 5. Install Prompt Updates (`/src/components/pwa-install-prompt/pwa-install-prompt.tsx`)

- **Modified**: Only show install prompt on mobile devices
- **Enhanced**: Better mobile detection logic

### 6. Manifest Updates (`/public/manifest.json`)

- **Added**: `display_override` property for better PWA detection

## How It Works

### Detection Logic

The system checks for:

1. **Installation Status**: Uses CSS media queries and navigator properties

   - `(display-mode: standalone)`
   - `(display-mode: fullscreen)`
   - `(display-mode: minimal-ui)`
   - `navigator.standalone` (iOS)
   - URL parameter `utm_source=homescreen`

2. **Mobile Detection**: Checks user agent for mobile patterns

   - Android, iOS, Windows Phone, etc.

3. **Environment**: Only activates in production

### Behavior

- **Browser Access**: No service worker registration, no PWA features
- **Installed Mobile App**: Full PWA functionality with caching, offline support
- **Desktop**: Install prompt not shown, limited PWA features
- **Development**: PWA completely disabled to prevent warnings

## Benefits

1. **Reduced Server Load**: Caching only for installed apps
2. **Better UX**: PWA features only where they add value
3. **No Development Warnings**: Clean development environment
4. **Selective Functionality**: Features activate based on context

## Testing

To test the implementation:

1. **Browser**: Visit site in mobile browser - should work normally without SW
2. **Install**: Use "Add to Home Screen" on mobile
3. **Installed App**: Launch from home screen - should have PWA features
4. **Check Console**: Look for PWA status logs in development mode

## Technical Notes

- Service worker registration is handled manually, not by next-pwa
- Multiple fallback detection methods ensure compatibility
- Automatic cleanup prevents zombie service workers
- Display mode listeners handle installation state changes
