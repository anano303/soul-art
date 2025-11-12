# 🔥 GA4 ერორების სწრაფი ანალიზი - Step by Step

## 🎯 მიზანი: იპოვე 500+ "general error" და გაიგე რა პრობლემაა

---

## ⚡ ᲡᲬᲠᲐᲤᲘ ᲒᲖᲐ (5 წუთში)

### ნაბიჯი 1: გადადი GA4-ში

1. გახსენი https://analytics.google.com
2. აირჩიე SoulArt property
3. გადადი **Reports** → **Engagement** → **Events**

### ნაბიჯი 2: ნახე ერორების მთლიანი რაოდენობა

1. Event name-ებში იპოვე:
   - `error_occurred` - ყველა ერორი
   - `api_error` - API ერორები (ეს შენთვის უფრო საინტერესო)
   - `api_call` - ყველა API request (წარმატებული და წარუმატებელი)

### ნაბიჯი 3: შექმენი Custom Report

Click **Explore** (მარცხენა sidebar-ში) → **+ Create new exploration**

---

## 📊 EXPLORATION REPORT - API Errors

### Template: Free Form

#### 1️⃣ DIMENSIONS (მარჯვენა sidebar)

დააჭირე **+** და დაამატე:

- `Event name`
- **Custom dimensions** → `error_type`
- **Custom dimensions** → `api_endpoint`
- **Custom dimensions** → `api_method`
- **Custom dimensions** → `api_status`
- **Custom dimensions** → `error_category`
- **Custom dimensions** → `error_message`
- **Custom dimensions** → `page_path`
- `Date and hour`

#### 2️⃣ METRICS (მარჯვენა sidebar)

დაამატე:

- `Event count`
- `Total users`
- `Sessions`

#### 3️⃣ ROWS (ცხრილის კონფიგურაცია)

Drag & drop ეს dimensions-ები **ROWS**-ში:

1. `error_type`
2. `api_endpoint`
3. `api_status`
4. `error_message`

#### 4️⃣ VALUES (ცხრილის კონფიგურაცია)

Drag & drop **VALUES**-ში:

- `Event count`
- `Total users`

#### 5️⃣ FILTERS

დააჭირე **Filters** → **+ Add filter**:

**Filter 1: მხოლოდ API Errors**

```
Event name = api_error
```

ან

**Filter 2: ყველა Error**

```
Event name = error_occurred
```

#### 6️⃣ DATE RANGE

აირჩიე:

- Last 7 days
- Last 30 days
- Custom range

---

## 📈 რას დაინახავ

### მაგალითი Output:

| error_type       | api_endpoint               | api_status | error_message         | Event count | Total users |
| ---------------- | -------------------------- | ---------- | --------------------- | ----------- | ----------- |
| api_error        | /v1/users/me/addresses/... | 500        | Internal server error | 523         | 87          |
| api_error        | /v1/products               | 404        | Product not found     | 234         | 45          |
| auth_error       | /v1/orders                 | 401        | სესია ვადაგასულია     | 156         | 89          |
| validation_error | /v1/cart/add               | 400        | Invalid product ID    | 98          | 34          |

---

## 🔍 რა გეუბნება ეს ციფრები

### მაგალითი 1: 500+ errors on /addresses endpoint

```
error_type: api_error
api_endpoint: /v1/users/me/addresses/...
api_status: 500
error_category: server_error
Event count: 523
```

**რა ნიშნავს:**

- ✋ **Server-side პრობლემა** (500 = internal server error)
- 📍 **Endpoint:** addresses update/create/delete
- 👥 **87 მომხმარებელს ჰქონდა ეს პრობლემა**
- 🔢 **523-ჯერ მოხდა** (შესაძლოა იგივე users რამდენჯერმე სცადეს)

**რას უნდა გააკეთო:**

1. ✅ **უკვე გამოსწორდა!** (ObjectId comparison issue)
2. Deploy კოდი production-ზე
3. Monitor GA4-ში შემცირდა თუ არა

---

### მაგალითი 2: 404 errors on /products

```
error_type: api_error
api_endpoint: /v1/products
api_status: 404
error_category: client_error
```

**რა ნიშნავს:**

- ⚠️ **Client-side პრობლემა** (404 = not found)
- User-ები ეძებენ products რომლებიც არ არსებობს
- ან frontend არასწორ URL-ს აგზავნის

**რას უნდა გააკეთო:**

1. შეამოწმე რა product IDs-ზე ხდება 404
2. იქნებ deleted products-ზე თუ დარჩენილი links
3. დაამატე fallback UI "product not found"-ისთვის

---

### მაგალითი 3: 401 Auth Errors

```
error_type: auth_error
api_status: 401
error_message: სესია ვადაგასულია
```

**რა ნიშნავს:**

- 🔐 Token-ები expire-დება და refresh არ მუშაობს კარგად
- User-ები logout-დებიან და redirect-დებიან login page-ზე

**რას უნდა გააკეთო:**

1. შეამოწმე `refreshTokens()` ფუნქცია
2. გაზარდე token lifetime
3. დაამატე უკეთესი UX session expiry-სთვის

---

## 🎨 ADVANCED: Error Timeline

### როგორ ვნახოთ ერორები დროის მიხედვით

1. **Same Exploration Report**
2. **ROWS**-ში დაამატე: `Date and hour`
3. **Visualization** → Line chart
4. **X-axis:** Date and hour
5. **Y-axis:** Event count
6. **Breakdown:** error_type

**რას დაინახავ:**

- როდის მოხდა spike (რომელ დღეს/საათზე)
- პერიოდული ერორები (ყოველი დილით? ყოველ საღამოს?)
- განახლების შემდეგ შემცირდა თუ არა

---

## 📱 Mobile vs Desktop Errors

### როგორ ვნახოთ სად ხდება მეტი ერორი

1. **Add dimension:** `Device category`
2. **ROWS:** Device category → error_type → api_endpoint
3. **Compare:** Mobile vs Desktop vs Tablet

---

## 🌍 Errors by Page

### რომელ გვერდებზე ხდება ყველაზე მეტი ერორი

1. **Add dimension:** `page_path`
2. **ROWS:** page_path → error_type → api_endpoint
3. **Sort:** Event count (descending)

**მაგალითი Output:**

```
/checkout → auth_error → /v1/orders → 234 errors
/profile/addresses → api_error → /v1/users/me/addresses → 523 errors
/shop → api_error → /v1/products → 156 errors
```

---

## ⚡ REAL-TIME Monitoring

### DebugView - ნახე რა ხდება ახლა

1. GA4 → **Configure** → **DebugView**
2. გახსენი website ახალ tab-ში
3. URL-ში დაამატე: `?debug_mode=true`
4. ან Chrome Extension: **Google Analytics Debugger**

**რას დაინახავ:**

- Real-time events როგორც ისინი იგზავნებიან
- ყველა parameter-ი
- შეამოწმე იგზავნება თუ არა სწორი data

---

## 🎯 CHECKLIST: 500+ ერორების ანალიზი

### ნაბიჯი 1: იდენტიფიკაცია ✅

- [ ] რა ტიპისაა? (api_error, network_error, auth_error, etc.)
- [ ] რომელ endpoint-ზე? (api_endpoint)
- [ ] რა status code? (api_status)
- [ ] 4xx თუ 5xx? (error_category)
- [ ] რამდენჯერ? (Event count)
- [ ] რამდენ user-ს? (Total users)

### ნაბიჯი 2: კონტექსტი ✅

- [ ] რომელ გვერდზე? (page_path)
- [ ] რა method? (api_method - GET, POST, PUT, DELETE)
- [ ] რა message? (error_message)
- [ ] როდის? (Date and hour)

### ნაბიჯი 3: პრიორიტიზაცია ✅

**High Priority:**

- [ ] 500-ები (server errors) - სერვერის პრობლემა
- [ ] ხშირი ერორები (>100 count)
- [ ] ბევრ user-ს (>50 users)
- [ ] Critical endpoints (orders, payments, auth)

**Medium Priority:**

- [ ] 400-ები (client errors) - validation, not found
- [ ] საშუალო სიხშირე (10-100 count)

**Low Priority:**

- [ ] იშვიათი ერორები (<10 count)
- [ ] არა-critical endpoints

### ნაბიჯი 4: გამოსწორება ✅

- [ ] Backend fix (for 5xx)
- [ ] Frontend fix (for 4xx)
- [ ] Validation improvement
- [ ] Better error messages
- [ ] Fallback UI

### ნაბიჯი 5: Verify ✅

- [ ] Deploy to production
- [ ] Monitor GA4 (შემცირდა?)
- [ ] Check DebugView (არ ხდება?)
- [ ] User feedback (უჩივლებიან?)

---

## 🚨 TOP ERRORS TO FIX FIRST

### 1. Server Errors (5xx) - CRITICAL

```sql
error_category = "server_error"
api_status >= 500
```

**ეს თქვენი პასუხისმგებლობაა** - სერვერი იშლება

### 2. Auth Errors - HIGH

```sql
error_type = "auth_error"
api_status = 401 OR 403
```

**User-ები ვერ შედიან/ვერ იყენებენ** - დიდი პრობლემა

### 3. Payment Errors - HIGH

```sql
api_endpoint CONTAINS "payment" OR "order"
error_type = "api_error"
```

**User-ები ვერ ყიდულობენ** - გაყიდვების დაკარგვა

### 4. Product Errors - MEDIUM

```sql
api_endpoint CONTAINS "product"
error_type = "api_error"
```

**User-ები ვერ ნახულობენ პროდუქტებს** - UX პრობლემა

### 5. Other 4xx - LOW

```sql
error_category = "client_error"
api_status = 404 OR 400
```

**შესაძლოა user-ის შეცდომა** - დაბალი პრიორიტეტი

---

## 📞 დახმარება

### თუ ვერ ხედავ Custom Dimensions

**პრობლემა:** "error_type", "api_endpoint" dimensions არ ჩანს

**გადაწყვეტა:**

1. GA4 → **Configure** → **Custom definitions**
2. Click **Create custom dimension**
3. დაამატე თითოეული:

| Dimension name | Event parameter | Scope |
| -------------- | --------------- | ----- |
| error_type     | error_type      | Event |
| api_endpoint   | api_endpoint    | Event |
| api_method     | api_method      | Event |
| api_status     | api_status      | Event |
| error_category | error_category  | Event |
| error_message  | error_message   | Event |

4. **დაელოდე 24 საათი** data-ს დასაგროვებლად

---

### თუ არ ჩანს Events

**პრობლემა:** "api_error" event არ ჩანს Reports-ში

**გადაწყვეტა:**

1. შეამოწმე DebugView - იგზავნება?
2. დაელოდე რამდენიმე საათი (data processing time)
3. შეამოწმე console - არის თუ არა "[GA4 Error Tracking]"?
4. შეამოწმე gtag loaded-ია თუ არა: `window.gtag`

---

## ✅ შედეგი

**ახლა შენ:**

- 🎯 **ხედავ ყველა ერორს** დეტალურად
- 📊 **აანალიზებ ტენდენციებს** დროის მიხედვით
- 🔍 **იცავი პრიორიტეტებს** critical errors-ზე
- ⚡ **სწრაფად ასწორებ** პრობლემებს
- 📈 **ამოწმებ შედეგს** real-time

**არ უნდა დაგავიწყდეს:**

- Deploy new code production-ზე
- Monitor GA4 error count
- Create alerts for critical errors

**წარმატებები! 🚀**
