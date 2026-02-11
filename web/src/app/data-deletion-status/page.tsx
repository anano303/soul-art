"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";

function DataDeletionContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const confirmationCode = searchParams?.get("code");

  const translations = {
    en: {
      title: "Data Deletion Request",
      subtitle: "Your Facebook Data Deletion Status",
      codeLabel: "Confirmation Code:",
      noCode: "No confirmation code provided",
      statusTitle: "Deletion Status",
      statusPending: "Your data deletion request is being processed.",
      statusInfo:
        "We have received your request to delete your Facebook-connected data from SoulArt. This process typically completes within 30 days.",
      whatDeleted: "What data will be deleted?",
      deletedItems: [
        "Your Facebook-linked profile information",
        "Associated login credentials",
        "Any data collected through Facebook integration",
      ],
      note: "Note: This only affects data associated with your Facebook login. If you created a separate account with email, that data is not affected.",
      contact: "If you have any questions, please contact us at:",
      email: "support@soulart.ge",
      backHome: "Back to Home",
    },
    ka: {
      title: "მონაცემთა წაშლის მოთხოვნა",
      subtitle: "თქვენი Facebook მონაცემების წაშლის სტატუსი",
      codeLabel: "დადასტურების კოდი:",
      noCode: "დადასტურების კოდი არ არის მითითებული",
      statusTitle: "წაშლის სტატუსი",
      statusPending: "თქვენი მონაცემების წაშლის მოთხოვნა მუშავდება.",
      statusInfo:
        "ჩვენ მივიღეთ თქვენი მოთხოვნა SoulArt-დან Facebook-თან დაკავშირებული მონაცემების წაშლაზე. ეს პროცესი ჩვეულებრივ 30 დღეში სრულდება.",
      whatDeleted: "რა მონაცემები წაიშლება?",
      deletedItems: [
        "თქვენი Facebook-თან დაკავშირებული პროფილის ინფორმაცია",
        "დაკავშირებული შესვლის მონაცემები",
        "Facebook ინტეგრაციის მეშვეობით შეგროვებული ნებისმიერი მონაცემი",
      ],
      note: "შენიშვნა: ეს მხოლოდ თქვენი Facebook შესვლასთან დაკავშირებულ მონაცემებს ეხება. თუ ელ.ფოსტით ცალკე ანგარიში შექმენით, ის მონაცემები არ იმოქმედებს.",
      contact: "თუ გაქვთ კითხვები, დაგვიკავშირდით:",
      email: "support@soulart.ge",
      backHome: "მთავარ გვერდზე დაბრუნება",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#012645] px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <p className="mt-2 text-gray-300">{t.subtitle}</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {confirmationCode ? (
              <>
                {/* Confirmation Code */}
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">{t.codeLabel}</p>
                  <p className="text-lg font-mono font-semibold text-[#012645] break-all">
                    {confirmationCode}
                  </p>
                </div>

                {/* Status */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.statusTitle}
                  </h2>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                    <span className="text-gray-700">{t.statusPending}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{t.statusInfo}</p>
                </div>

                {/* What's Deleted */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.whatDeleted}
                  </h2>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {t.deletedItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Note */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                  <p className="text-sm text-blue-700">{t.note}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-4">❓</div>
                <p className="text-gray-600">{t.noCode}</p>
              </div>
            )}

            {/* Contact */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-600 text-center">
                {t.contact}{" "}
                <a
                  href={`mailto:${t.email}`}
                  className="text-[#012645] font-semibold hover:underline"
                >
                  {t.email}
                </a>
              </p>
            </div>

            {/* Back Home */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#012645] hover:bg-[#023a66] transition-colors"
              >
                {t.backHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataDeletionStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#012645] border-t-transparent"></div>
        </div>
      }
    >
      <DataDeletionContent />
    </Suspense>
  );
}
