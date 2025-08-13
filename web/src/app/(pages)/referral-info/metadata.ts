import { Metadata } from "next";

export function generateMetadata(locale = "ge"): Metadata {
  const metadata = {
    ge: {
      title: "რეფერალური სისტემა | SoulArt.ge",
      description:
        "გამოიმუშავე ფული SoulArt.ge-ზე! მოიწვიე მეგობრები და მიიღე ფულადი ბონუსები ყველა წარმატებული რეფერალისთვის.",
    },
    en: {
      title: "Referral System | SoulArt.ge",
      description:
        "Earn money on SoulArt.ge! Invite friends and receive cash bonuses for every successful referral.",
    },
  };

  const content = metadata[locale as keyof typeof metadata] || metadata.ge;

  return {
    title: {
      default: content.title,
      template: "%s | SoulArt.ge",
    },
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      images: "/referral-banner.jpg",
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: "/referral-banner.jpg",
    },
  };
}

