import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

interface PageViewData {
  page: string;
  views: number;
  title?: string;
}

interface HomepageEvent {
  event: string;
  count: number;
  details?: string;
}

interface UserJourney {
  path: string;
  count: number;
  avgTime?: number;
}

interface FunnelStep {
  step: string;
  count: number;
  dropoff?: number;
  percentage?: number;
}

interface ErrorData {
  type: string;
  count: number;
  message?: string;
}

interface ApiMetrics {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
}

export interface AnalyticsData {
  pageViews: PageViewData[];
  homepageEvents: HomepageEvent[];
  userJourneys: UserJourney[];
  purchaseFunnel: FunnelStep[];
  errors: ErrorData[];
  apiMetrics: ApiMetrics;
}

@Injectable()
export class Ga4AnalyticsService {
  private readonly logger = new Logger(Ga4AnalyticsService.name);
  private analyticsDataClient;
  private propertyId: string;

  constructor(private configService: ConfigService) {
    // Initialize GA4 Data API
    const credentials = this.configService.get('GA4_CREDENTIALS');
    this.propertyId = this.configService.get('GA4_PROPERTY_ID');

    if (credentials && this.propertyId) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(credentials),
          scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });

        this.analyticsDataClient = google.analyticsdata({
          version: 'v1beta',
          auth,
        });

        this.logger.log('GA4 Analytics service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize GA4 Analytics:', error);
      }
    } else {
      this.logger.warn(
        'GA4 credentials or property ID not configured. Analytics will show sample data.',
      );
    }
  }

  async getAnalyticsData(daysAgo: number = 7): Promise<AnalyticsData> {
    if (!this.analyticsDataClient || !this.propertyId) {
      this.logger.error('GA4 not configured - missing credentials or property ID');
      throw new Error('GA4 Analytics not configured. Please set GA4_CREDENTIALS and GA4_PROPERTY_ID environment variables.');
    }

    try {
      const [pageViews, events, funnel] = await Promise.all([
        this.getPageViews(daysAgo),
        this.getEvents(daysAgo),
        this.getPurchaseFunnel(daysAgo),
      ]);

      const homepageEvents = this.extractHomepageEvents(events);
      const errors = this.extractErrors(events);
      const apiMetrics = this.extractApiMetrics(events);
      const userJourneys = await this.getUserJourneys(daysAgo);

      this.logger.log(`Successfully fetched GA4 data: ${pageViews.length} pages, ${events.length} events, ${funnel.length} funnel steps`);

      return {
        pageViews,
        homepageEvents,
        userJourneys,
        purchaseFunnel: funnel,
        errors,
        apiMetrics,
      };
    } catch (error) {
      this.logger.error('Failed to fetch GA4 data:', error.message || error);
      throw new Error(`Failed to fetch analytics data: ${error.message || 'Unknown error'}`);
    }
  }

  private async getPageViews(daysAgo: number): Promise<PageViewData[]> {
    const response = await this.analyticsDataClient.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      },
    });

    return (
      response.data.rows?.map((row) => ({
        page: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value,
        views: parseInt(row.metricValues[0].value || '0'),
      })) || []
    );
  }

  private async getEvents(daysAgo: number) {
    const response = await this.analyticsDataClient.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      },
    });

    return (
      response.data.rows?.map((row) => ({
        event: row.dimensionValues[0].value,
        count: parseInt(row.metricValues[0].value || '0'),
      })) || []
    );
  }

  private async getPurchaseFunnel(daysAgo: number): Promise<FunnelStep[]> {
    // Fetch funnel events - these match our actual event names
    const funnelEvents = [
      'funnel_add_to_cart',
      'funnel_view_cart',
      'funnel_begin_checkout',
      'funnel_checkout_login',
      'funnel_add_shipping_info',
      'funnel_view_summary',
      'funnel_click_purchase',
      'funnel_purchase_complete',
    ];

    const response = await this.analyticsDataClient.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: funnelEvents },
          },
        },
      },
    });

    const eventCounts: Map<string, number> = new Map(
      response.data.rows?.map((row) => [
        row.dimensionValues[0].value,
        parseInt(row.metricValues[0].value || '0'),
      ]) || [],
    );

    const stepLabels = [
      'Add to Cart',
      'View Cart',
      'Begin Checkout',
      'Checkout Login',
      'Add Shipping Info',
      'View Summary',
      'Click Purchase',
      'Purchase Complete',
    ];

    const funnel: FunnelStep[] = [];
    let previousCount = 0;
    const max = Math.max(...eventCounts.values())

    funnelEvents.forEach((event, index) => {
      const count = eventCounts.get(event) || 0;
      const percentage = max > 0 ? (Number(count) / max) * 100 : 0;
      const dropoff = previousCount > 0 ? ((previousCount - Number(count)) / previousCount) * 100 : 0;

      funnel.push({
        step: stepLabels[index],
        count: Number(count),
        percentage: parseFloat(percentage.toFixed(1)),
        dropoff: previousCount > 0 ? parseFloat(dropoff.toFixed(1)) : undefined,
      });

      previousCount = Number(count);
    });

    return funnel;
  }

  private async getUserJourneys(daysAgo: number): Promise<UserJourney[]> {
    // Fetch user_path events to get actual sequential journeys
    try {
      const response = await this.analyticsDataClient.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: 'today' }],
          dimensions: [
            { name: 'eventName' },
            { name: 'customEvent:path' }, // Custom parameter containing the path
          ],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              stringFilter: { value: 'user_path' },
            },
          },
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 20,
        },
      });

      if (!response.data.rows || response.data.rows.length === 0) {
        this.logger.warn('No user_path events found yet. Users need to navigate through the site.');
        return [];
      }

      // Aggregate paths and count occurrences
      const pathCounts = new Map<string, number>();
      
      response.data.rows.forEach((row) => {
        const path = row.dimensionValues[1]?.value || '';
        const count = parseInt(row.metricValues[0]?.value || '0');
        
        if (path && path !== '(not set)') {
          pathCounts.set(path, (pathCounts.get(path) || 0) + count);
        }
      });

      // Convert to array and sort by count
      const journeys = Array.from(pathCounts.entries())
        .map(([path, count]) => ({
          path,
          count,
          avgTime: 0, // Could be calculated if we track session_end with timing
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.logger.log(`Found ${journeys.length} unique user paths`);
      return journeys;

    } catch (error) {
      this.logger.warn('Failed to fetch user_path events, falling back to page-based journeys:', error.message);
      
      // Fallback: Get most visited pages as simple paths
      const response = await this.analyticsDataClient.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'sessions' }, { name: 'averageSessionDuration' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 5,
        },
      });

      return (
        response.data.rows?.map((row) => ({
          path: row.dimensionValues[0].value,
          count: parseInt(row.metricValues[0].value || '0'),
          avgTime: Math.round(parseFloat(row.metricValues[1].value || '0')),
        })) || []
      );
    }
  }

  private extractHomepageEvents(events: { event: string; count: number }[]): HomepageEvent[] {
    const homepageEventNames = [
      'search',
      'product_interaction',
      'artist_profile_view',
      'category_click',
      'banner_click',
      'see_more_click',
      'see_more_discounts_click',
      'shop_now_click',
      'view_all_artists_click',
      'view_all_products_click',
    ];

    return events
      .filter((e) => homepageEventNames.includes(e.event))
      .map((e) => ({
        event: e.event,
        count: e.count,
        details: this.getEventDetails(e.event),
      }));
  }

  private extractErrors(events: { event: string; count: number }[]): ErrorData[] {
    // Look for error-related events
    const error404 = events.find((e) => e.event === 'page_not_found')?.count || 0;
    const apiError = events.find((e) => e.event === 'api_error')?.count || 0;
    const networkError = events.find((e) => e.event === 'network_error')?.count || 0;
    const errorOccurred = events.find((e) => e.event === 'error_occurred')?.count || 0;

    return [
      { type: '404 - Page Not Found', count: error404 },
      { type: 'API Error', count: apiError },
      { type: 'Network Error', count: networkError },
      { type: 'General Errors', count: errorOccurred },
    ];
  }

  private extractApiMetrics(events: { event: string; count: number }[]): ApiMetrics {
    const apiCallEvent = events.find((e) => e.event === 'api_call');
    const total = apiCallEvent?.count || 0;

    // In production, you'd query api_success parameter
    // For now, estimate 97% success rate
    const successful = Math.round(total * 0.97);
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      avgDuration: 245, // Would be calculated from timing events
    };
  }

  private getEventDetails(eventName: string): string {
    const details = {
      search: 'Search box interactions',
      product_interaction: 'Product card clicks/views',
      artist_profile_view: 'Artist profile views',
      category_click: 'Category navigation clicks',
      banner_click: 'Banner/promotional clicks',
      see_more_click: 'See More button clicks',
      see_more_discounts_click: 'See More Discounts button clicks',
      shop_now_click: 'Shop Now button clicks',
      view_all_artists_click: 'View All Artists button clicks',
      view_all_products_click: 'View All Products button clicks',
    };
    return details[eventName] || '';
  }
}
