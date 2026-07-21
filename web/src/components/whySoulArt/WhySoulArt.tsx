"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import "./WhySoulArt.css";

/**
 * "Why SoulArt" homepage section — real, visible body copy so the page has
 * genuine content matching the H1 keywords (ქართველი ხელოვანი, ნამუშევარი, …).
 * Rendered on the server (imported statically, not dynamic/ssr:false) so search
 * engines see the text. Bilingual via the language toggle.
 */
export default function WhySoulArt() {
  const { language } = useLanguage();
  const en = language === "en";

  return (
    <section className="why-soulart" aria-labelledby="why-soulart-title">
      <div className="why-soulart__inner">
        <h2 id="why-soulart-title" className="why-soulart__title">
          {en
            ? "Georgian artists' work, all in one place"
            : "SoulArt — ქართველი ხელოვანების ნამუშევრები ერთ სივრცეში"}
        </h2>

        {en ? (
          <>
            <p>
              SoulArt is a Georgian online marketplace that brings the work of
              more than 500 Georgian artists together in one place. Here you&apos;ll
              find <Link href="/paintings">original paintings</Link> and{" "}
              <Link href="/handmade">handmade items</Link> that come straight from
              the makers themselves. Every piece is one of a kind — a single
              original with its own story, not a mass-produced print.
            </p>
            <p>
              Established names sit alongside emerging talent — painters,
              ceramicists, jewellers and craftspeople from across Georgia. The
              range of styles is wide: landscapes, portraits, abstract and
              contemporary original art, as well as handmade pieces for your home
              and thoughtful, one-off gifts. Every artwork links to its
              artist&apos;s profile, so you can explore their story and the rest of
              their collection.
            </p>
            <p>
              When you buy on SoulArt, you support a Georgian artist directly and
              bring genuine, original art into your space — a hand-made original,
              not a reproduction. Checkout is simple and secure, with delivery
              across Georgia and a money-back guarantee if anything isn&apos;t
              right, so buying art online feels calm and trustworthy.
            </p>
          </>
        ) : (
          <>
            <p>
              SoulArt არის ქართული ონლაინ პლატფორმა, სადაც 500-ზე მეტი ქართველი
              ხელოვანის ნამუშევარია ერთ სივრცეში თავმოყრილი. აქ იპოვი ორიგინალ{" "}
              <Link href="/paintings">ნახატებსა</Link> და ხელნაკეთ{" "}
              <Link href="/handmade">ნივთებს</Link>, რომლებიც პირდაპირ ავტორების
              ხელიდან მოდის. თითოეული ნამუშევარი უნიკალურია — ის ერთადერთია და
              თავისი ისტორია აქვს.
            </p>
            <p>
              ჩვენს გვერდზე ერთმანეთის გვერდით დგანან როგორც აღიარებული, ისე
              ახალგაზრდა, პერსპექტიული ქართველი ხელოვანები — მხატვრები,
              კერამიკოსები, იუველირები და ხელოსნები. სტილების არჩევანი
              მრავალფეროვანია: პეიზაჟი, პორტრეტი, აბსტრაქცია და თანამედროვე
              ორიგინალი ხელოვნება, ასევე ხელნაკეთი ნივთები ინტერიერის დეკორისა და
              განსაკუთრებული საჩუქრებისთვის. თითოეულ ნამუშევართან შეგიძლია გაეცნო
              ავტორის პროფილს და მის სხვა ქმნილებებს.
            </p>
            <p>
              SoulArt-ზე ნამუშევრის შეძენით შენ პირდაპირ ქართველ ხელოვანს უჭერ
              მხარს და შენს სივრცეში ნამდვილ, ორიგინალ ხელოვნებას ამატებ — არა
              ბეჭდურ რეპროდუქციას, არამედ ხელით შექმნილ ორიგინალს. შესყიდვა
              მარტივი და უსაფრთხოა, მიწოდება კი მთელ საქართველოში ხდება, პრობლემის
              შემთხვევაში კი თანხის დაბრუნების გარანტიით სარგებლობ.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
