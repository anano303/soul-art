# GA4 Real-Time Analytics Setup Guide

## 🎯 Overview

Your dashboard now fetches **real analytics data** from Google Analytics 4 via the GA4 Data API. If GA4 credentials are not configured, it automatically falls back to sample data.

## 📋 Prerequisites

1. **Google Analytics 4 Property** - Already have your GA4 Measurement ID configured
2. **Google Cloud Project** - Need to create one for API access
3. **Service Account** - For server-side API access

## 🚀 Setup Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"**
3. Name it: `soulart-analytics` (or any name you prefer)
4. Click **"Create"**

### Step 2: Enable GA4 Data API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for **"Google Analytics Data API"**
3. Click on it and press **"Enable"**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in:
   - **Service account name**: `ga4-analytics-reader`
   - **Service account ID**: (auto-filled)
   - **Description**: `Service account for reading GA4 analytics data`
4. Click **"Create and Continue"**
5. **Grant this service account access to project**:
   - Role: `Viewer` (or `Analytics Viewer`)
6. Click **"Continue"** → **"Done"**

### Step 4: Generate Service Account Key

1. Find your service account in the list
2. Click on it to open details
3. Go to **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **JSON** format
6. Click **"Create"**
7. **Save the downloaded JSON file securely** (you'll need it in Step 6)

### Step 5: Grant GA4 Access to Service Account

1. Go to your [Google Analytics account](https://analytics.google.com/)
2. Click **Admin** (gear icon, bottom left)
3. In the **Property** column, click **Property Access Management**
4. Click **"+"** button → **"Add users"**
5. Enter the service account email (looks like: `ga4-analytics-reader@soulart-analytics.iam.gserviceaccount.com`)
6. Assign role: **Viewer**
7. Click **"Add"**

### Step 6: Configure Server Environment Variables

Add these to your `/server/.env` file:

```bash
# GA4 Analytics Configuration
GA4_PROPERTY_ID=your-property-id
GA4_CREDENTIALS={"type":"service_account","project_id":"soulart-analytics",...}
```

#### How to get your Property ID:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** → Select your property
3. Click **Property Settings**
4. Copy the **Property ID** (looks like: `123456789`)

#### How to format GA4_CREDENTIALS:

Open the JSON file you downloaded in Step 4, and copy **the entire contents** as a single-line string:

```bash
GA4_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"ga4-analytics-reader@...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

⚠️ **Important**: Make sure the entire JSON is on ONE line, no line breaks!

### Step 7: Restart Server

```bash
cd server
npm run dev
```

You should see in the logs:
```
[Ga4AnalyticsService] GA4 Analytics service initialized successfully
```

## ✅ Verify It's Working

1. Go to `/admin/analytics` in your browser
2. The dashboard should now show **real data** from GA4
3. Try changing the time range (7 days, 30 days, 90 days)
4. Data should update accordingly

## 📊 What Data is Fetched

The backend fetches:

1. **Page Views** - Top 10 pages by views
2. **Events** - All custom events (search, clicks, etc.)
3. **Purchase Funnel** - 7-step conversion funnel
4. **User Journeys** - Top user navigation paths
5. **API Metrics** - Derived from event counts
6. **Errors** - Error events tracked

## 🔧 Troubleshooting

### "GA4 not configured, returning sample data"

**Cause**: Missing or invalid credentials

**Fix**: 
- Check `.env` file has both `GA4_PROPERTY_ID` and `GA4_CREDENTIALS`
- Verify credentials JSON is valid and on one line
- Restart server after adding credentials

### "Failed to fetch GA4 data"

**Possible causes**:
1. Service account doesn't have access to GA4 property → Go back to Step 5
2. GA4 Data API not enabled → Go back to Step 2
3. Wrong Property ID → Verify in Step 6

**Check server logs** for detailed error messages:
```bash
cd server
npm run dev
```

### Dashboard shows 0 for everything

**Cause**: Not enough data in GA4 yet

**Fix**: 
- Make sure events are being tracked (check browser console for GA4 events)
- Wait 24-48 hours for GA4 to process data
- Check GA4 real-time reports to verify events are coming in

### "Permission denied" errors

**Cause**: Service account doesn't have proper permissions

**Fix**:
1. Go to Google Analytics → Admin → Property Access Management
2. Verify service account email is listed with "Viewer" role
3. If not, add it again following Step 5

## 🔒 Security Notes

- **Never commit** the service account JSON file to Git
- Store `GA4_CREDENTIALS` securely in environment variables only
- Service account has **read-only** access (Viewer role)
- Credentials are used server-side only, never exposed to frontend

## 📝 Additional Configuration

### Custom Date Ranges

The dashboard supports 7, 30, and 90 days. To add more:

1. Edit `/web/src/components/ga4-dashboard/ga4-dashboard.tsx`
2. Add buttons for your desired ranges
3. Backend will automatically support any number of days

### Add More Metrics

To fetch additional GA4 metrics:

1. Edit `/server/src/analytics/ga4-analytics.service.ts`
2. Add new methods to query GA4 Data API
3. Update `AnalyticsData` interface
4. Update frontend dashboard to display new data

## 📚 Resources

- [GA4 Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Available Metrics & Dimensions](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts)

## 🎉 Done!

Your analytics dashboard is now connected to **real Google Analytics 4 data**! 

The system will:
- ✅ Fetch live data when credentials are configured
- ✅ Show sample data as fallback if not configured
- ✅ Update every time you change the time range
- ✅ Respect admin-only access (requires authentication)
