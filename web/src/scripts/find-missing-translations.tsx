import { getMissingTranslations } from "@/lib/translations";

// Function to be run in development to find all missing translations
export function checkMissingTranslations(): void {
  const missingGeorgian = getMissingTranslations("ge");
  const missingEnglish = getMissingTranslations("en");

  console.log("Missing Georgian translations:", missingGeorgian);
  console.log("Missing English translations:", missingEnglish);
}

// Run this in your browser console or in a development setup
// checkMissingTranslations();
