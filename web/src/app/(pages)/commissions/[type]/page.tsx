import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../commissions.css";

// SEO landing pages that funnel into the commission request form.
// Each slug maps to a commission `type` (pre-fills the form).
const LANDINGS: Record<
  string,
  {
    type: string;
    title: string;
    description: string;
    h1: string;
    body: string;
  }
> = {
  portrait: {
    type: "portrait",
    title: "პორტრეტის დახატვა — ინდივიდუალური შეკვეთა | SoulArt",
    description:
      "შეუკვეთე ხელით ნახატი პორტრეტი ფოტოდან. ატვირთე სურათი და მიიღე ფასები ქართველი მხატვრებისგან 24 საათში.",
    h1: "პორტრეტის დახატვა ფოტოდან",
    body: "გსურს პორტრეტი საჩუქრად ან საკუთარი თავისთვის? ატვირთე ფოტო, მიუთითე ზომა და მიიღე შეთავაზებები რამდენიმე პროფესიონალი მხატვრისგან.",
  },
  caricature: {
    type: "caricature",
    title: "კარიკატურის შეკვეთა ფოტოდან | SoulArt",
    description:
      "მხიარული კარიკატურა ფოტოდან — იდეალური საჩუქარი. ატვირთე ფოტო და მიიღე ფასები მხატვრებისგან.",
    h1: "კარიკატურის შეკვეთა",
    body: "აჩუქე მეგობარს ორიგინალური, ხელით დახატული კარიკატურა. ატვირთე ფოტო და აირჩიე შენთვის საუკეთესო შეთავაზება.",
  },
  "pet-portrait": {
    type: "pet",
    title: "შინაური ცხოველის პორტრეტი | SoulArt",
    description:
      "დაუკვეთე შენი შინაური ცხოველის ხელით ნახატი პორტრეტი. ატვირთე ფოტო და მიიღე ფასები მხატვრებისგან.",
    h1: "შინაური ცხოველის პორტრეტი",
    body: "შენი ცხოველის უნიკალური პორტრეტი ხელით შესრულებული. ატვირთე საუკეთესო ფოტო და მიიღე შეთავაზებები.",
  },
  "oil-portrait": {
    type: "portrait",
    title: "ზეთის ტილოზე პორტრეტი | SoulArt",
    description:
      "ზეთის საღებავით შესრულებული პორტრეტი ტილოზე. ატვირთე ფოტო და მიიღე ფასები პროფესიონალი მხატვრებისგან.",
    h1: "ზეთის ტილოზე პორტრეტი",
    body: "კლასიკური ზეთის პორტრეტი ტილოზე — თაობებში დარჩენადი ნამუშევარი. ატვირთე ფოტო და დაიწყე.",
  },
  "family-portrait": {
    type: "portrait",
    title: "ოჯახური პორტრეტი ფოტოდან | SoulArt",
    description:
      "ოჯახის ხელით ნახატი პორტრეტი ფოტოდან — განსაკუთრებული საჩუქარი. მიიღე ფასები მხატვრებისგან.",
    h1: "ოჯახური პორტრეტი",
    body: "დააფიქსირე ოჯახის განსაკუთრებული მომენტი ხელით შესრულებულ პორტრეტში.",
  },
  "canvas-copy": {
    type: "copy",
    title: "ნახატის ასლის დახატვა ტილოზე | SoulArt",
    description:
      "შეუკვეთე ცნობილი ნახატის ხელით ასლი ტილოზე. ატვირთე სასურველი ნახატი და მიიღე ფასები.",
    h1: "ნახატის ასლის დახატვა",
    body: "გიყვარს რომელიმე ნახატი? მიიღე მისი ხელით შესრულებული ასლი შენთვის სასურველ ზომაში.",
  },
  "wedding-portrait": {
    type: "portrait",
    title: "საქორწინო პორტრეტი ფოტოდან | SoulArt",
    description:
      "საქორწინო პორტრეტი ფოტოდან — რომანტიული საჩუქარი. ატვირთე ფოტო და მიიღე ფასები მხატვრებისგან.",
    h1: "საქორწინო პორტრეტი",
    body: "თქვენი განსაკუთრებული დღის ხელით ნახატი პორტრეტი. ატვირთე საუკეთესო ფოტო.",
  },
};

export function generateStaticParams() {
  return Object.keys(LANDINGS).map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const l = LANDINGS[type];
  if (!l) return {};
  return {
    title: l.title,
    description: l.description,
    alternates: { canonical: `/commissions/${type}` },
    openGraph: { title: l.title, description: l.description },
  };
}

export default async function CommissionLandingPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const l = LANDINGS[type];
  if (!l) notFound();

  return (
    <div className="commission-page">
      <div className="commission-container">
        <h1 className="commission-h1">{l.h1}</h1>
        <p className="commission-sub">{l.body}</p>

        <div className="commission-form">
          <ol style={{ lineHeight: 2, color: "#012645", paddingLeft: "1.2rem" }}>
            <li>📷 ატვირთე სასურველი ფოტო</li>
            <li>✍️ აღწერე რა გინდა და მიუთითე ზომა</li>
            <li>💬 24 საათის განმავლობაში მიიღე ფასები რამდენიმე მხატვრისგან</li>
            <li>🎁 აირჩიე საუკეთესო შეთავაზება და გადაიხადე უსაფრთხოდ</li>
          </ol>

          <Link
            href={`/commissions/new?type=${l.type}`}
            className="commission-submit"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            შეკვეთის განთავსება
          </Link>
        </div>
      </div>
    </div>
  );
}
