import type { Metadata } from "next";

// Commission request page shares a real preview (title, description, image)
// instead of falling back to the generic site metadata.
// NOTE: language is currently client-side (cookie/?lang), so this server
// metadata is Georgian (the site default). Per-URL EN/GE metadata comes with
// the path-based i18n migration.
export const metadata: Metadata = {
  title: "შეუკვეთე ინდივიდუალური ნამუშევარი | SoulArt",
  description:
    "ატვირთე ფოტო, აღწერე შენი იდეა და 24 საათში მიიღე შეთავაზებები ქართველი ხელოვანებისგან — პორტრეტი, კარიკატურა, პეტ-პორტრეტი ან ნებისმიერი ნახატის ასლი. Order a custom portrait, caricature or a copy of any painting from Georgian artists on SoulArt.",
  keywords: [
    "ინდივიდუალური შეკვეთა",
    "პორტრეტის დახატვა",
    "კარიკატურა",
    "ნახატის ასლი",
    "custom portrait",
    "commission art Georgia",
    "SoulArt",
  ],
  alternates: { canonical: "/commissions/new" },
  openGraph: {
    title: "შეუკვეთე ინდივიდუალური ნამუშევარი | SoulArt",
    description:
      "ატვირთე ფოტო, აღწერე რა გინდა და მიიღე ფასები რამდენიმე ხელოვანისგან 24 საათში.",
    url: "https://soulart.ge/commissions/new",
    siteName: "SoulArt",
    locale: "ka_GE",
    type: "website",
    images: [
      {
        url: "/images/order.png",
        width: 1200,
        height: 630,
        alt: "SoulArt — ინდივიდუალური შეკვეთა",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "შეუკვეთე ინდივიდუალური ნამუშევარი | SoulArt",
    description:
      "ატვირთე ფოტო, აღწერე რა გინდა და მიიღე ფასები რამდენიმე ხელოვანისგან 24 საათში.",
    images: ["/images/order.png"],
  },
};

export default function NewCommissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
