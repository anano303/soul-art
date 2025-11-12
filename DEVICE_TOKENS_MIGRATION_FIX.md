# Device Tokens Migration Fix

## 🐛 პრობლემა

### Error Message:

```
[Nest] 39460 - 13.11.2025, 01:59:25 ERROR [ExceptionsHandler]
User validation failed:
  knownDevices.3.refreshToken: Path `refreshToken` is required.
  knownDevices.3.refreshTokenJti: Path `refreshTokenJti` is required.

ValidationError: User validation failed:
  knownDevices.3.refreshToken: Path `refreshToken` is required.
  knownDevices.3.refreshTokenJti: Path `refreshTokenJti` is required.
```

### Root Cause:

**User schema-ში** `knownDevices` array-ის elements-ს სჭირდებათ `refreshToken` და `refreshTokenJti` fields (marked as `required: true`).

**პრობლემა იყო:**

1. ძველი user records რომლებსაც უკვე ჰქონდათ devices schema-ში არ ჰქონდათ ეს fields
2. `cleanupDuplicateDevices()` method-ი რომელიც devices-ს "clean" ხდიდა, უბრალოდ copy-ს უკეთებდა არსებულ devices-ს და უკან აბრუნებდა
3. `trustDeviceAndGenerateTokens()` method-ი ახალ trusted device-ს ქმნიდა **БEZ** tokens fields-ების

**შედეგი:** როცა Mongoose-ს სცდებოდა save ან update user document-ი, validation error იფრენდა რადგან required fields არ იყო.

---

## ✅ გამოსწორება

### 1. Schema Update - Fields დაიქნა Optional

**ფაილი:** `server/src/users/schemas/user.schema.ts`

```typescript
// Before (required: true)
refreshToken: { type: String, required: true },
refreshTokenJti: { type: String, required: true },

// After (required: false, default: null)
refreshToken: { type: String, required: false, default: null },
refreshTokenJti: { type: String, required: false, default: null },
```

**რატომ:**

- Backward compatibility - ძველი devices რომლებსაც არ აქვთ tokens არ გაიფუჭდებიან
- Migration support - თანდათან შეიძლება devices-ს დაემატოს tokens
- Graceful degradation - null tokens = device needs re-authentication

**TypeScript Interface:**

```typescript
knownDevices?: Array<{
  fingerprint: string;
  userAgent: string;
  lastSeen: Date;
  trusted: boolean;
  sessionId: string;
  refreshToken?: string | null;  // ახლა optional
  refreshTokenJti?: string | null; // ახლა optional
  isActive: boolean;
}>;
```

---

### 2. Cleanup Method Fix

**ფაილი:** `server/src/users/services/auth.service.ts`

**Method:** `cleanupDuplicateDevices()`

```typescript
// Before (just copies device as-is)
acc.push(device);

// After (ensures all fields exist)
const cleanDevice = {
  fingerprint: device.fingerprint,
  userAgent: device.userAgent,
  lastSeen: device.lastSeen,
  trusted: device.trusted,
  sessionId: device.sessionId,
  refreshToken: device.refreshToken || null, // ← დაემატა
  refreshTokenJti: device.refreshTokenJti || null, // ← დაემატა
  isActive: device.isActive !== undefined ? device.isActive : true,
};

acc.push(cleanDevice);
```

**რას აკეთებს:**

- უზრუნველყოფს რომ ყველა device object-ს აქვს ყველა საჭირო field
- თუ `refreshToken` ან `refreshTokenJti` არ არსებობს, ამატებს `null`-ს
- Migration-friendly - ძველი devices იქნება null tokens-ით

---

### 3. Trust Device Fix

**ფაილი:** `server/src/users/services/auth.service.ts`

**Method:** `trustDeviceAndGenerateTokens()`

```typescript
// Before (device created WITHOUT tokens)
$push: {
  knownDevices: {
    fingerprint: deviceFingerprint,
    userAgent: userAgent,
    lastSeen: new Date(),
    trusted: true,
    sessionId,
    // ❌ refreshToken and refreshTokenJti missing!
  }
}

// After (device created WITH tokens)
// Generate tokens first
const jti = require('crypto').randomUUID();
const [accessToken, refreshToken] = await Promise.all([...]);

$push: {
  knownDevices: {
    fingerprint: deviceFingerprint,
    userAgent: userAgent,
    lastSeen: new Date(),
    trusted: true,
    sessionId,
    refreshToken,           // ✅ დაემატა
    refreshTokenJti: jti,   // ✅ დაემატა
    isActive: true,
  }
}
```

**რას აკეთებს:**

- როცა ახალი trusted device იქმნება, ახლა ასევე იქმნება tokens
- Device object სრულყოფილად იქმნება ყველა საჭირო field-ით
- Validation არ ჩაიშლება

---

## 🔧 Migration Script

### ფაილი: `server/src/scripts/migrate-device-tokens.ts`

**რას აკეთებს:**

1. პოულობს ყველა user-ს რომელსაც აქვს `knownDevices`
2. თითოეული device-ისთვის ამოწმებს არის თუ არა `refreshToken` და `refreshTokenJti`
3. თუ არ არის, ამატებს `null` values
4. Update-ს უკეთებს database-ში

**როგორ გამოვიყენოთ:**

```bash
cd server
npm run migrate:device-tokens
```

**Output მაგალითი:**

```
🔄 Starting device tokens migration...
Found 145 users with devices
✅ Updated user john@example.com - migrated 2 devices
✅ Updated user jane@example.com - migrated 1 devices
...
📊 Migration complete!
   Users updated: 87
   Devices migrated: 143
✨ Migration script finished successfully
```

---

## 🚀 Deployment Steps

### ნაბიჯი 1: Code Changes

```bash
cd server
git add src/users/schemas/user.schema.ts
git add src/users/services/auth.service.ts
git add src/scripts/migrate-device-tokens.ts
git add package.json
git commit -m "fix: Device tokens validation error - make fields optional and add migration"
```

### ნაბიჯი 2: Run Migration (BEFORE deploying)

```bash
# Stop server first
npm run migrate:device-tokens
```

**IMPORTANT:** Run migration BEFORE deploying new code to ensure all existing devices have proper structure.

### ნაბიჯი 3: Deploy

```bash
npm run build
npm run start:prod
```

### ნაბიჯი 4: Verify

Check logs for validation errors:

```bash
# Should NOT see:
# ❌ "User validation failed: knownDevices.X.refreshToken: Path `refreshToken` is required"

# Should see:
# ✅ Normal login/auth operations
```

---

## 📊 What Changed

### Database (MongoDB)

**Before:**

```javascript
{
  knownDevices: [
    {
      fingerprint: "abc123",
      userAgent: "Chrome...",
      sessionId: "session-xyz",
      trusted: true,
      // ❌ refreshToken missing
      // ❌ refreshTokenJti missing
    },
  ];
}
```

**After Migration:**

```javascript
{
  knownDevices: [
    {
      fingerprint: "abc123",
      userAgent: "Chrome...",
      sessionId: "session-xyz",
      trusted: true,
      refreshToken: null, // ✅ დაემატა
      refreshTokenJti: null, // ✅ დაემატა
      isActive: true,
    },
  ];
}
```

**After New Login:**

```javascript
{
  knownDevices: [
    {
      fingerprint: "abc123",
      userAgent: "Chrome...",
      sessionId: "session-xyz",
      trusted: true,
      refreshToken: "eyJhbGc...", // ✅ real token
      refreshTokenJti: "uuid-jti-123", // ✅ real JTI
      isActive: true,
    },
  ];
}
```

---

## 🧪 Testing

### Test 1: Existing User Login

```bash
# User with old devices (no tokens) should login successfully
POST /api/v1/auth/login
{
  "email": "test@example.com",
  "password": "password"
}

# Expected: ✅ Success, device gets tokens
```

### Test 2: New Device Trust

```bash
# Trust new device should create device with tokens
POST /api/v1/auth/trust-device
{
  "deviceFingerprint": "new-device-123",
  "userAgent": "Firefox..."
}

# Expected: ✅ Success, device created with tokens
```

### Test 3: Cleanup Duplicates

```bash
# Internal call to cleanupDuplicateDevices
# Should not throw validation error

# Expected: ✅ Success, devices have null or real tokens
```

---

## 📝 Notes

### Why Optional Instead of Required?

**Option A: Keep Required** (რაც არ ამუშავდა)

- ✅ Ensures data integrity
- ❌ Breaks existing data
- ❌ Needs complex migration
- ❌ No graceful degradation

**Option B: Make Optional** (რაც გამოვიყენეთ) ✅

- ✅ Backward compatible
- ✅ Simple migration
- ✅ Graceful degradation (null = needs auth)
- ✅ Works with existing data
- ⚠️ Need to handle null case in code

### When Tokens Are Populated

Tokens are set when:

1. **New login** - `generateTokens()` creates device with tokens
2. **Token refresh** - Updates device tokens
3. **Trust device** - Creates trusted device with tokens

Tokens are `null` when:

1. **Old devices** (before this fix) - after migration
2. **Device logout** - tokens are explicitly set to null
3. **Inactive devices** - tokens removed for security

### Handling Null Tokens

In your code, handle null tokens:

```typescript
const device = user.knownDevices?.find((d) => d.fingerprint === fingerprint);

if (!device) {
  // Device not found - needs registration
}

if (!device.refreshToken || !device.refreshTokenJti) {
  // Device needs re-authentication
  // Force user to login again to get new tokens
}

if (device.isActive && device.refreshToken) {
  // Device is valid and has tokens - can use
}
```

---

## ✅ Results

### Before Fix:

- ❌ ValidationError crashes server
- ❌ Users with old devices can't login
- ❌ Trust device fails
- ❌ Cleanup duplicates fails

### After Fix:

- ✅ No validation errors
- ✅ Old devices work (with null tokens)
- ✅ New devices get tokens automatically
- ✅ Cleanup works smoothly
- ✅ Backward compatible

---

## 🎓 Lessons Learned

1. **Always make schema changes backward compatible** - don't break existing data
2. **Provide migration scripts** - help transition smoothly
3. **Use optional fields for gradual rollout** - better than hard requirements
4. **Handle null/undefined explicitly** - don't assume fields exist
5. **Test with real data** - production has surprises

---

## 📞 Troubleshooting

### Still seeing validation error?

1. **Check migration ran:**

   ```bash
   npm run migrate:device-tokens
   ```

2. **Check database:**

   ```javascript
   db.users.find({ "knownDevices.refreshToken": { $exists: false } });
   // Should return 0 documents after migration
   ```

3. **Check schema:**

   ```typescript
   // Make sure it says required: false
   refreshToken: { type: String, required: false, default: null },
   ```

4. **Restart server:**
   ```bash
   npm run start:prod
   ```

---

## 🚀 Summary

**გამოსწორდა:** Device tokens validation error

**როგორ:**

1. ✅ Schema fields გახდა optional
2. ✅ Cleanup method დაემატა token handling
3. ✅ Trust device method დაემატა tokens
4. ✅ Migration script შეიქმნა

**შედეგი:** ყველაფერი მუშაობს, არც ძველი data იშლება, არც ახალი functionality კარგავს!

🎉 **Problem Solved!**
