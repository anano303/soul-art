"use client";

import Link from "next/link";
import {
  Store,
  Plus,
  MousePointerClick,
  Eye,
  CreditCard,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import { useEtsyStatus } from "@/hooks/use-etsy-enabled";
import EtsyDisabledNotice from "@/components/etsyDisabledNotice/EtsyDisabledNotice";
import "./etsy-guide.css";

export default function EtsyGuidePage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { enabled: etsyEnabled, temporarilyDisabled } = useEtsyStatus(
    user?.role === Role.Admin,
  );
  const isKa = language !== "en";

  if (!etsyEnabled) {
    return (
      <div className="etsy-guide-page">
        <div className="etsy-guide-soon">
          <Store size={40} />
          <h1>{isKa ? "მალე..." : "Coming soon..."}</h1>
          <p>
            {isKa
              ? "Etsy ინტეგრაცია მალე გაეშვება — თვალი ადევნეთ სიახლეებს!"
              : "The Etsy integration is launching soon — stay tuned!"}
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    {
      icon: <Store size={22} />,
      title: isKa ? "გახსენი ჩემი ნამუშევრები" : "Open My Artworks",
      text: isKa
        ? "გადადი შენს ნამუშევრებზე — Etsy-ის ღილაკი ყველა დამტკიცებულ ნამუშევარს აქვს."
        : "Go to your artworks — every approved artwork has an Etsy button.",
    },
    {
      icon: <MousePointerClick size={22} />,
      title: isKa ? "დააჭირე ნარინჯისფერ ღილაკს" : "Click the orange button",
      text: isKa
        ? "ნამუშევრის მოქმედებებში იპოვე ნარინჯისფერი Etsy ღილაკი და გახსენი განთავსების გვერდი."
        : "Find the orange Etsy button in the artwork's actions and open the publish page.",
    },
    {
      icon: <Eye size={22} />,
      title: isKa ? "ნახე როგორ გამოჩნდება" : "Preview the listing",
      text: isKa
        ? "გვერდზე ზუსტად ხედავ, როგორ გამოჩნდება შენი ნამუშევარი Etsy-ზე — ინგლისური აღწერით, ტეგებითა და დოლარში გადაყვანილი ფასით."
        : "You'll see exactly how your artwork will look on Etsy — English description, tags and the USD price.",
    },
    {
      icon: <CreditCard size={22} />,
      title: isKa ? "გადაიხადე მცირე საფასური" : "Pay the small fee",
      text: isKa
        ? "Etsy listing-ის განთავსება ფასიანია — საფასურის გადახდა შეგიძლია ბალანსიდან ან ბარათით. გაყიდვისას მიიღებ იმდენივეს, რამდენსაც SoulArt-ზე გაყიდვისას."
        : "Etsy charges for listings — pay the fee from your balance or by card. When it sells, you earn the same as on SoulArt.",
    },
    {
      icon: <Globe size={22} />,
      title: isKa
        ? "მზადაა — შენი ხელოვნება მსოფლიოშია!"
        : "Done — your art is global!",
      text: isKa
        ? "ნამუშევარი ქვეყნდება SoulArt-ის ოფიციალურ Etsy მაღაზიაში და ხილვადია მილიონობით მყიდველისთვის."
        : "Your artwork is published in SoulArt's official Etsy shop, visible to millions of buyers.",
    },
  ];

  return (
    <div className="etsy-guide-page">
      <div className="etsy-guide-hero">
        <span className="etsy-guide-tag">
          <Store size={15} />
          SoulArt × Etsy
        </span>
        <h1>
          {isKa
            ? "როგორ განათავსო ნამუშევარი Etsy-ზე"
            : "How to list your artwork on Etsy"}
        </h1>
        <p>
          {isKa
            ? "SoulArt-ის ნამუშევრები ახლა Etsy-ზეც — მსოფლიოს უდიდეს ხელნაკეთი ნივთების ბაზარზე. ერთი ღილაკი, და შენი ხელოვნება საერთაშორისო მყიდველებთანაა."
            : "SoulArt artworks are now on Etsy too — the world's largest handmade marketplace. One click and your art reaches international buyers."}
        </p>
      </div>

      {temporarilyDisabled && <EtsyDisabledNotice />}

      <div className="etsy-guide-steps">
        {steps.map((step, i) => (
          <div key={i} className="etsy-guide-step">
            <div className="etsy-guide-step-num">{i + 1}</div>
            <div className="etsy-guide-step-icon">{step.icon}</div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="etsy-guide-facts">
        <h2>{isKa ? "რა ღირს?" : "What does it cost?"}</h2>
        <ul>
          <li>
            <CheckCircle2 size={16} />
            {isKa
              ? "ერთჯერადი listing-ის საფასური — ფარავს Etsy-ის მოსაკრებელს"
              : "A one-time listing fee — covers Etsy's own charge"}
          </li>
          <li>
            <CheckCircle2 size={16} />
            {isKa
              ? "Etsy-ზე ფასი შენს ფასზე მეტია — Etsy-ის საკომისიოებსა და ვალუტის კონვერტაციას ჩვენ ვფარავთ ამ სხვაობით"
              : "The Etsy price is above yours — that difference covers Etsy's fees and currency conversion"}
          </li>
          <li>
            <CheckCircle2 size={16} />
            {isKa
              ? "გაყიდვისას იღებ ზუსტად იმდენს, რამდენსაც SoulArt-ზე გაყიდვისას"
              : "When it sells you earn exactly what you'd earn on a SoulArt sale"}
          </li>
        </ul>
      </div>

      <div className="etsy-guide-facts">
        <h2>
          {isKa ? "რა უნდა გავითვალისწინო?" : "What should you keep in mind?"}
        </h2>
        <ul>
          <li>
            <CheckCircle2 size={16} />
            {isKa
              ? "აუცილებლად ატვირთეთ მინიმუმ 4 სურათი და შეავსეთ ყველა საჭირო ველი ინგლისურ ენაზეც — წინააღმდეგ შემთხვევაში თქვენი ნამუშევრები არ გამოჩნდება Etsy-ს საძიებო სისტემაში."
              : "Be sure to upload at least 4 photos and fill in all required fields in English as well — otherwise your listings won't show up in Etsy search results."}
          </li>
          <li>
            <CheckCircle2 size={16} />
            {isKa
              ? "ფასში ტრანსპორტირების ღირებულება ნუ ჩართავთ — ამას Etsy თავად დაამატებს."
              : "Don't add shipping cost into the price — Etsy adds this automatically."}
          </li>
        </ul>
      </div>
      <div className="etsy-guide-cta">
        <h2>{isKa ? "სცადე ახლავე" : "Try it now"}</h2>
        <div className="etsy-guide-cta-buttons">
          <Link
            href="/admin/products#etsy-button"
            className="etsy-guide-btn etsy-guide-btn-primary"
          >
            <Store size={18} />
            {isKa ? "ჩემი ნამუშევრები" : "My artworks"}
          </Link>
          <Link
            href="/admin/products/create"
            className="etsy-guide-btn etsy-guide-btn-secondary"
          >
            <Plus size={18} />
            {isKa ? "დაამატე ახალი ნამუშევარი" : "Add a new artwork"}
          </Link>
        </div>
        <p className="etsy-guide-cta-note">
          {isKa
            ? "ჯერ არ ხარ გამყიდველი? დაამატე პირველი ნამუშევარი და დამტკიცების შემდეგ Etsy-ზეც განათავსებ."
            : "Not a seller yet? Add your first artwork — once approved, you can list it on Etsy too."}
        </p>
      </div>
    </div>
  );
}
