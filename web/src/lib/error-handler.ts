import { AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: string[];
}

export class ErrorHandler {
  static handle(error: unknown, customMessage?: string, t?: (key: string) => string): ApiError {
    console.error('[ErrorHandler]', error);

    // Handle Axios errors
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const data = error.response?.data;

      // Handle rate limiting errors specifically
      if (status === 429) {
        return {
          message: t ? t('errors.rateLimitExceeded') : 'ძალიან ბევრი მოთხოვნა. გთხოვთ, სცადოთ რამდენიმე წუთის შემდეგ.',
          statusCode: status,
        };
      }

      // Extract error message from response
      let message = customMessage || (t ? t('errors.generic') : 'დაფიქსირდა შეცდომა');
      
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      } else if (data?.error) {
        message = data.error;
      } else if (error.message) {
        message = error.message;
      }

      // Handle specific status codes with translations
      switch (status) {
        case 401:
          message = t ? t('errors.unauthorized') : 'ავტორიზაცია საჭიროა';
          break;
        case 403:
          message = t ? t('errors.forbidden') : 'წვდომა აკრძალულია';
          break;
        case 404:
          message = t ? t('errors.notFound') : 'მონაცემები ვერ მოიძებნა';
          break;
        case 429:
          message = t ? t('errors.rateLimitExceeded') : 'ძალიან ბევრი მოთხოვნა. გთხოვთ, მოიცადოთ';
          break;
        case 500:
          message = t ? t('errors.serverError') : 'სერვერის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით';
          break;
      }

      return {
        message,
        statusCode: status,
        details: Array.isArray(data?.message) ? data.message : undefined
      };
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        message: customMessage || error.message || (t ? t('errors.generic') : 'დაფიქსირდა შეცდომა'),
        statusCode: 500
      };
    }

    // Handle unknown errors
    return {
      message: customMessage || (t ? t('errors.generic') : 'უცნობი შეცდომა'),
      statusCode: 500
    };
  }

  static showToast(error: unknown, customMessage?: string, t?: (key: string) => string) {
    const apiError = this.handle(error, customMessage, t);
    
    toast({
      title: t ? t('errors.errorTitle') : "შეცდომა",
      description: apiError.message,
      variant: "destructive",
    });
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage?: string,
    t?: (key: string) => string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.showToast(error, errorMessage, t);
      return null;
    }
  }
}
