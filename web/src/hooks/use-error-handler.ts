import { ErrorHandler } from "@/lib/error-handler";
import { useLanguage } from "./LanguageContext";

export const useErrorHandler = () => {
  const { t } = useLanguage();

  return {
    handle: (error: unknown, customMessage?: string) => ErrorHandler.handle(error, customMessage, t),
    showToast: (error: unknown, customMessage?: string) => ErrorHandler.showToast(error, customMessage, t),
    withErrorHandling: <T>(operation: () => Promise<T>, errorMessage?: string) => 
      ErrorHandler.withErrorHandling(operation, errorMessage, t),
  };
};
