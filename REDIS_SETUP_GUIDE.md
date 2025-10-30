# Redis Setup Guide - სერვერის სტაბილურობისთვის

## რატომ გვჭირდება Redis?

BullMQ queue system-მა გჭირდება Redis რომ შეინახოს job-ების ინფორმაცია და გაუზიაროს ისინი worker process-ებს. Redis გარეშე queue ვერ იმუშავებს და სერვერი ვერ დაიწყება.

---

## Windows Development Environment

### Option 1: Memurai (Windows-ისთვის ოფიციალური Redis)

1. ჩამოტვირთე და დააინსტალირე Memurai (უფასო Redis for Windows):

   ```
   https://www.memurai.com/get-memurai
   ```

2. დაინსტალირების შემდეგ Memurai service ავტომატურად გაეშვება და იმუშავებს:

   - Host: `localhost`
   - Port: `6379`

3. `.env` ფაილში არაფერი არ გჭირდება - default settings იმუშავებს:
   ```
   # Redis-ის კონფიგი (არ არის სავალდებულო თუ localhost:6379-ზე გაქვს)
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   # REDIS_PASSWORD=
   ```

### Option 2: Redis Stack Docker (რეკომენდებული Development-ისთვის)

```bash
# Run Redis with Docker
docker run -d -p 6379:6379 --name redis-soulart redis:alpine

# Check status
docker ps | grep redis

# Stop
docker stop redis-soulart

# Restart
docker start redis-soulart
```

---

## Production Environment (Vercel/Railway/Render)

### Option 1: Upstash Redis (რეკომენდებული - უფასო tier ყველაზე ლარგეა)

1. დარეგისტრირდი: https://upstash.com/
2. შექმენი Redis database (Free tier: 10,000 commands/day)
3. დააკოპირე connection details:

   ```env
   REDIS_HOST=your-redis-url.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password-here
   ```

4. Upstash-ის დამატებითი ფიჩები:
   - REST API (serverless functions-ისთვის)
   - Automatic backups
   - Global replication

### Option 2: Redis Labs (Free tier: 30MB)

1. დარეგისტრირდი: https://redis.com/try-free/
2. შექმენი database
3. დააკოპირე connection string

   ```env
   REDIS_HOST=redis-xxxxx.cloud.redislabs.com
   REDIS_PORT=xxxxx
   REDIS_PASSWORD=your-password
   ```

### Option 3: Railway Redis (თუ Railway-ზე deploy გაქვს)

```bash
# Railway CLI
railway add redis

# Environment variables ავტომატურად დაემატება:
# REDIS_URL=redis://default:password@host:port
```

---

## Environment Variables Configuration

**Development (.env ფაილში):**

```env
# თუ localhost:6379-ზე გაქვს Redis - არაფერი არ გჭირდება
# თუ სხვა პორტი/host გჭირდება:
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=optional
```

**Production (Vercel/Railway Environment Variables):**

```env
REDIS_HOST=your-production-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
```

---

## Redis-ის შემოწმება

### 1. Redis გაშვებულია თუ არა:

**Windows (Memurai):**

```powershell
# Check if Memurai service is running
Get-Service Memurai
```

**Docker:**

```bash
docker ps | grep redis
```

### 2. Redis-თან კავშირის ტესტი:

**Redis CLI:**

```bash
# Windows Memurai
memurai-cli ping
# Should return: PONG

# Docker
docker exec -it redis-soulart redis-cli ping
# Should return: PONG
```

**Node.js test script:**

```javascript
// test-redis.js
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

redis
  .ping()
  .then(() => console.log("✅ Redis connection successful"))
  .catch((err) => console.error("❌ Redis error:", err))
  .finally(() => redis.quit());
```

Run: `node test-redis.js`

---

## BullMQ Dashboard (არასავალდებულო - Job Monitoring)

თუ გინდა რომ ნახო queue-ების მდგომარეობა realtime:

```bash
npm install -g bull-board

# Start dashboard
bull-board
# Open: http://localhost:3000
```

ან დააინტეგრირე სერვერში bull-board როგორც endpoint.

---

## ხშირი პრობლემები და გადაწყვეტილებები

### ❌ "ECONNREFUSED 127.0.0.1:6379"

**პრობლემა:** Redis არ გაქვს გაშვებული  
**გადაწყვეტა:**

```bash
# Start Memurai service (Windows)
net start Memurai

# OR start Docker Redis
docker start redis-soulart
```

### ❌ "ERR operation not permitted"

**პრობლემა:** Redis password არასწორია  
**გადაწყვეტა:** შეამოწმე `REDIS_PASSWORD` environment variable

### ❌ Queue არ მუშაობს მაგრამ Redis კავშირია OK

**პრობლემა:** Worker process არ გაეშვა  
**გადაწყვეტა:**

- შეამოწმე logs: `YoutubeVideoProcessor` ლოგები უნდა ჩანდეს სერვერის start-ზე
- დარწმუნდი რომ `QueuesModule` import-ებულია `AppModule`-ში

---

## რეკომენდაციები

✅ **Development:** Memurai (Windows) ან Docker Redis  
✅ **Production:** Upstash Redis (უფასო tier საკმარისია)  
✅ **Monitoring:** BullMQ dashboard development-ში job-ების debug-ისთვის  
✅ **Security:** არასდროს commit-ო `.env` ფაილი Git-ში

---

## დამატებითი ინფორმაცია

- BullMQ Docs: https://docs.bullmq.io/
- Redis Docs: https://redis.io/docs/
- Upstash Docs: https://docs.upstash.com/redis
