# PWA Screenshots Setup Guide

The optimized manifest.json contains references to PWA screenshots which are important for a good installation experience. Here's how to set them up:

## 1. Create Screenshots Directory

```powershell
# Create the directory
mkdir -p public/pwa-screenshots
```

## 2. Add Screenshots

You need to add the following screenshots with the exact names and sizes:

1. **Desktop Screenshots (1280x720)**:

   - `desktop-home.png`: Screenshot of the home page in desktop view
   - `desktop-shop.png`: Screenshot of the shop page in desktop view

2. **Mobile Screenshots (720x1280)**:
   - `mobile-home.png`: Screenshot of the home page in mobile view
   - `mobile-shop.png`: Screenshot of the shop page in mobile view

## 3. Taking Screenshots

You can take screenshots using:

- Browser Developer Tools (F12) set to responsive design mode
- For desktop: Set width to 1280px and height to 720px
- For mobile: Set width to 720px and height to 1280px
- Use a screenshot tool (like Windows Snipping Tool or macOS Screenshot)

## 4. Image Format

- Save all images as PNG format
- Optimize them for web using tools like ImageOptim or TinyPNG

## 5. Verification

Once the screenshots are in place, you can validate your PWA configuration using:

```powershell
npm run pwa-audit
```

This will run Lighthouse and check that your PWA configuration is correct, including the screenshots.
