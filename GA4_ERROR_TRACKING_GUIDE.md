# Google Analytics 4 (GA4) Error Tracking Guide

## 📊 ერორების ტრექინგის სისტემა

ამ სისტემამ გააუმჯობესა GA4-ში ერორების მონიტორინგი და კატეგორიზაცია, რათა ადვილად იდენტიფიცირდეს პრობლემები და მათი წყარო.

---

## 🎯 ერორების ტიპები

### 1. **API Errors** (`api_error`)

API-დან მიღებული ერორები (HTTP 4xx, 5xx)

**Event Name:** `error_occurred` + `api_error`

**პარამეტრები:**

- `error_type`: "api_error"
- `error_message`: დეტალური შეტყობინება
- `api_endpoint`: endpoint-ის მისამართი (მაგ: `/v1/users/me/addresses/...`)
- `api_method`: HTTP method (GET, POST, PUT, DELETE)
- `api_status`: HTTP status code (400, 404, 500, etc.)
- `error_category`: "server_error" (5xx) ან "client_error" (4xx)
- `page_path`: გვერდი, სადაც მოხდა შეცდომა
- `page_url`: სრული URL
- `timestamp`: დროის ბეჭედი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `api_error`
2. Explore → Create custom report:
   - Dimensions: `error_type`, `api_endpoint`, `api_status`, `error_category`
   - Metrics: Event count
   - Filter: `error_type` = "api_error"

---

### 2. **Network Errors** (`network_error`)

ქსელის პრობლემები (კავშირის შეფერხება, timeout, etc.)

**Event Name:** `error_occurred`

**პარამეტრები:**

- `error_type`: "network_error"
- `error_message`: შეცდომის აღწერა
- `failed_url`: endpoint რომელმაც ვერ იმუშავა
- `api_endpoint`: endpoint-ის მისამართი
- `api_method`: HTTP method
- `page_path`: გვერდი
- `timestamp`: დროის ბეჭედი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `error_occurred`
2. Filter: `error_type` = "network_error"

---

### 3. **Authentication Errors** (`auth_error`)

ავტორიზაციის პრობლემები (expired session, unauthorized)

**Event Name:** `error_occurred`

**პარამეტრები:**

- `error_type`: "auth_error"
- `error_message`: "სესია ვადაგასულია" ან სხვა auth შეტყობინება
- `api_endpoint`: endpoint
- `api_method`: HTTP method
- `page_path`: გვერდი
- `timestamp`: დროის ბეჭედი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `error_occurred`
2. Filter: `error_type` = "auth_error"

---

### 4. **Validation Errors** (`validation_error`)

ვალიდაციის ერორები (არასწორი მონაცემები, required fields, etc.)

**Event Name:** `error_occurred`

**პარამეტრები:**

- `error_type`: "validation_error"
- `error_message`: ვალიდაციის შეტყობინება
- `api_endpoint`: endpoint
- `api_method`: HTTP method
- `page_path`: გვერდი
- `timestamp`: დროის ბეჭედი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `error_occurred`
2. Filter: `error_type` = "validation_error"

---

### 5. **Page Errors** (`page_error`)

გვერდზე მომხდარი JavaScript ერორები, React component errors

**Event Name:** `error_occurred`

**პარამეტრები:**

- `error_type`: "page_error"
- `error_message`: შეცდომის ტექსტი
- `error_stack`: stack trace
- `componentStack`: React component stack (ErrorBoundary-დან)
- `page_path`: გვერდი
- `timestamp`: დროის ბეჭედი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `error_occurred`
2. Filter: `error_type` = "page_error"

---

## 📈 API Call Tracking

**Event Name:** `api_call`

ყველა API request-ის ტრექინგი (წარმატებული და წარუმატებელი)

**პარამეტრები:**

- `api_endpoint`: endpoint-ის მისამართი
- `api_method`: HTTP method
- `api_status`: HTTP status code
- `api_duration_ms`: რამდენი მილიწამი დასჭირდა
- `api_success`: true/false
- `page_path`: გვერდი

**როგორ ვნახოთ GA4-ში:**

1. Reports → Events → `api_call`
2. Custom dimensions:
   - Group by `api_endpoint` - რომელი endpoint-ები იყენება ყველაზე მეტად
   - Filter by `api_success` = false - მხოლოდ წარუმატებელი call-ები
   - Group by `api_status` - რა status code-ები ბრუნდება

---

## 🔍 როგორ გავაანალიზოთ 500+ ერორი

### Option 1: GA4 Web Interface

1. **იდენტიფიცირება ერორების ტიპის მიხედვით:**

   ```
   Reports → Engagement → Events →
   Select "error_occurred" →
   View "error_type" dimension
   ```

2. **API ერორების დეტალური ანალიზი:**

   ```
   Explore → Create new exploration →
   Dimensions: api_endpoint, api_status, error_category
   Metrics: Event count
   Filter: error_type = "api_error"
   ```

3. **დროის მიხედვით:**
   ```
   Add date range comparison
   See when errors spiked
   ```

### Option 2: Custom Report შექმნა

**შექმენით Exploration Report:**

**Dimensions:**

- `error_type`
- `api_endpoint`
- `api_status`
- `error_category` (server_error vs client_error)
- `page_path`
- `error_message`

**Metrics:**

- Event count
- Users affected
- Sessions with errors

**Segments:**

- Time period (last 7 days, 30 days)
- Error type
- Status code range (4xx vs 5xx)

---

## 📊 ტიპური ანალიზის მაგალითები

### 1. ყველაზე ხშირი ერორები

```
Dimension: error_message
Metric: Event count
Sort: Descending
```

### 2. რომელი endpoint-ები ფეილავენ

```
Filter: error_type = "api_error"
Dimension: api_endpoint
Metric: Event count
```

### 3. 500 Server Errors

```
Filter: error_category = "server_error"
Dimension: api_endpoint, error_message
Metric: Event count
```

### 4. 400 Client Errors

```
Filter: error_category = "client_error"
Dimension: api_endpoint, api_status, error_message
Metric: Event count
```

### 5. რომელ გვერდებზე ხდება ერორები

```
Dimension: page_path
Metric: Event count
Filter: error_occurred
```

---

## 🛠️ გამოსწორების პროცესი

### ნაბიჯი 1: იდენტიფიკაცია

GA4-ში ნახეთ:

- რა ტიპის ერორია (`error_type`)
- რომელ endpoint-ზე (`api_endpoint`)
- რა status code (`api_status`)
- რამდენჯერ (`event_count`)

### ნაბიჯი 2: წყაროს პოვნა

- **500 ერორები**: სერვერის პრობლემა - ნახეთ backend logs
- **404 ერორები**: არასწორი URL ან endpoint არ არსებობს
- **401/403 ერორები**: authentication/authorization პრობლემა
- **400 ერორები**: არასწორი request data - ვალიდაცია

### ნაბიჯი 3: რეპროდუცირება

- `page_path`-იდან იცით რომელ გვერდზე
- `api_endpoint`-იდან იცით რა request-ი
- თავიდან გააკეთეთ ეს მოქმედება

### ნაბიჯი 4: გამოსწორება

- Backend-ზე დაასწორეთ endpoint
- Frontend-ზე დაასწორეთ validation
- შეამოწმეთ authentication flow

---

## 📝 რეალური მაგალითი

თქვენი შემთხვევა: **PUT `/v1/users/me/addresses/:addressId` - 500 error**

### GA4-ში ვნახავთ:

**Event:** `api_error`

```json
{
  "error_type": "api_error",
  "error_category": "server_error",
  "api_endpoint": "/v1/users/me/addresses/691500facd3a7d8dd482cc6e",
  "api_method": "PUT",
  "api_status": 500,
  "error_message": "Internal server error",
  "page_path": "/profile/addresses",
  "timestamp": "2025-11-13T..."
}
```

**Event:** `error_occurred`

```json
{
  "error_type": "api_error",
  "error_message": "Internal server error",
  "api_endpoint": "/v1/users/me/addresses/691500facd3a7d8dd482cc6e",
  "api_method": "PUT",
  "error_stack": "...",
  "page_path": "/profile/addresses"
}
```

### როგორ ვნახავთ:

1. GA4 → Events → `api_error`
2. Filter: `api_endpoint` contains "addresses"
3. Filter: `api_method` = "PUT"
4. დაინახავთ რამდენჯერ მოხდა

---

## 🎨 Dashboard შექმნა

შექმენით Custom Dashboard GA4-ში:

### Card 1: Total Errors by Type

- Metric: Event count
- Dimension: error_type
- Visualization: Pie chart

### Card 2: API Errors Timeline

- Metric: Event count
- Dimension: Date
- Filter: error_type = "api_error"
- Visualization: Line chart

### Card 3: Top Failed Endpoints

- Metric: Event count
- Dimension: api_endpoint
- Filter: api_success = false
- Visualization: Table

### Card 4: Error Distribution (4xx vs 5xx)

- Metric: Event count
- Dimension: error_category
- Filter: error_type = "api_error"
- Visualization: Bar chart

### Card 5: Pages with Most Errors

- Metric: Event count
- Dimension: page_path
- Filter: error_occurred
- Visualization: Table

---

## ✅ რას მივიღეთ ამ გაუმჯობესებით

### Before (ძველი სისტემა):

❌ ყველა ერორი "network_error"-ად
❌ არ ვიცით რა endpoint-ზე
❌ არ ვიცით 4xx თუ 5xx
❌ გაურკვეველი "Internal server error"

### After (ახალი სისტემა):

✅ ერორები დაყოფილია კატეგორიებად (api_error, network_error, auth_error, validation_error, page_error)
✅ ვიცით ზუსტი endpoint (`api_endpoint`)
✅ ვიცით HTTP method (`api_method`)
✅ ვიცით status code (`api_status`)
✅ ვიცით error category (server_error vs client_error)
✅ ვიცით რომელ გვერდზე მოხდა (`page_path`)
✅ ვიცით timestamp და user agent
✅ შეგვიძლია დავაჯგუფოთ და გავაანალიზოთ ტენდენციები

---

## 🚀 შემდეგი ნაბიჯები

1. **გახსენით GA4 და შექმენით Exploration Report** ზემოთ მოცემული dimension-ებით
2. **გაანალიზეთ 500+ ერორი:**
   - რა ტიპისაა (`error_type`)
   - რომელ endpoint-ებზე (`api_endpoint`)
   - 4xx თუ 5xx (`error_category`)
3. **პრიორიტიზაცია:**
   - პირველ რიგში 5xx ერორები (server_error)
   - შემდეგ ხშირი 4xx ერორები
4. **Fix and Monitor:**
   - გამოასწორეთ backend/frontend
   - თვალი ადევნეთ GA4-ში ერორების შემცირებას

---

## 📞 დახმარება

თუ რაიმე გაურკვეველია:

1. GA4 → Configure → DebugView - ნახეთ real-time events
2. Browser Console → [GA4 Error Tracking] - ნახეთ რა იგზავნება
3. Backend logs - შეამოწმეთ server-side errors

**ახლა თქვენ გაქვთ სრული visibility ერორებზე და შეგიძლიათ სწრაფად იპოვოთ და გამოასწოროთ პრობლემები!** 🎉
