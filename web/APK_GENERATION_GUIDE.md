# SoulArt PWA - APK Generation Guide

## მოკლე აღწერა

ეს გზამკვლევი გეხმარებათ SoulArt PWA აპლიკაციის APK ფაილის შესაქმნელად Android მოწყობილობებისთვის.

## წინაპირობები

### 1. Bubblewrap-ის დაყენება

```bash
npm install -g @bubblewrap/cli
```

### 2. Android Studio და Java SDK

- დააყენეთ Android Studio
- დააყენეთ Java 8 ან უფრო ახალი ვერსია
- დააყენეთ Android SDK და Build Tools

### 3. მოამზადეთ Digital Asset Links

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ge.soulart.twa",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

## APK გენერაციის ნაბიჯები

### 1. TWA პროექტის ინიციალიზაცია

```bash
bubblewrap init --manifest=https://soulart.ge/manifest.json
```

### 2. კონფიგურაციის პარამეტრები

- **Package Name**: `ge.soulart.twa`
- **App Name**: `SoulArt`
- **Display Mode**: `standalone`
- **Orientation**: `portrait`
- **Theme Color**: `#012645`
- **Background Color**: `#ffffff`

### 3. APK ფაილის შექმნა

```bash
bubblewrap build
```

### 4. APK ფაილის ხელმოწერა (Production)

```bash
# გენერირება keystore
keytool -genkey -v -keystore soulart-release-key.keystore -alias soulart -keyalg RSA -keysize 2048 -validity 10000

# APK ხელმოწერა
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore soulart-release-key.keystore app-release-unsigned.apk soulart

# zipalign ოპტიმიზაცია
zipalign -v 4 app-release-unsigned.apk SoulArt-release.apk
```

## პროექტის სტრუქტურა

```
twa-project/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   └── res/
│   │       ├── mipmap-*/
│   │       └── values/
├── build.gradle
└── gradle/
```

## მნიშვნელოვანი ფაილები

### AndroidManifest.xml

```xml
<activity
    android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
    android:exported="true"
    android:label="@string/app_name"
    android:theme="@style/Theme.App.Starting">

    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="soulart.ge" />
    </intent-filter>
</activity>
```

## ტესტირება

### 1. Local APK ტესტი

```bash
adb install -r SoulArt-debug.apk
```

### 2. Performance შემოწმება

- Lighthouse PWA audit
- WebPageTest მობილური ტესტი
- Chrome DevTools Network throttling

## განსაზღვრა Play Store-სთვის

### 1. საჭირო ასეტები

- 512x512 app icon
- Feature graphic (1024x500)
- Screenshots (სხვადასხვა device sizes)
- App description ქართულ და ინგლისურ ენებზე

### 2. Play Console Setup

- შექმენით Google Play Console ანგარიში
- ატვირთეთ signed APK
- შეავსეთ აპლიკაციის ინფორმაცია
- დააყენეთ content rating
- განსაზღვრეთ pricing & distribution

## უსაფრთხოების პარამეტრები

### 1. Digital Asset Links

ფაილი: `/.well-known/assetlinks.json`

### 2. HTTPS Certificate

- SSL/TLS certificate validation
- HSTS headers
- CSP (Content Security Policy)

## მონიტორინგი და ანალიტიკა

### 1. Firebase Analytics

```javascript
// PWA Analytics
gtag("config", "GA_MEASUREMENT_ID", {
  "custom_map.dimension1": "pwa_installed",
});
```

### 2. Performance Metrics

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)

## Troubleshooting

### ხშირი პრობლემები:

1. **TWA Validation Issues**: შეამოწმეთ Digital Asset Links
2. **Icon Resolution**: დარწმუნდით რომ ყველა საჭირო ზომის იკონი არსებობს
3. **Manifest Errors**: გამოიყენეთ PWA Builder validation tool
4. **Build Failures**: შეამოწმეთ Android SDK paths

### Debug კომანდები:

```bash
# პორტების შემოწმება
adb logcat | grep -i twa

# Manifest validation
npx pwa-asset-generator --help

# Network debugging
adb shell dumpsys connectivity
```

## დამატებითი რესურსები

- [PWA Builder](https://www.pwabuilder.com/)
- [Bubblewrap Documentation](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA Quality Criteria](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Play Store Guidelines](https://play.google.com/about/developer-content-policy/)

## მხარდაჭერა

თუ გაქვთ კითხვები ან პრობლემები, შემოგვწვდით [support@soulart.ge](mailto:support@soulart.ge)
