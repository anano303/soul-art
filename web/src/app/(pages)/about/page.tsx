"use client";

import Link from "next/link";
import Image from "next/image";
import "./about.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function AboutPage() {
  const { t, language } = useLanguage();

  return (
    <div className="about-container">
      {/* Hero */}
      <div className="about-hero">
        <h1 className="about-title">{t("about.title")}</h1>
        <p className="about-hero-sub">{t("about.description")}</p>
      </div>

      {/* Story: Bilingual section */}
      <section className="about-section about-story">
        <div className="about-grid">
          <div className="about-card">
            <div className="about-badge">
              {language === "en" ? "Our Story" : "ჩვენი ისტორია"}
            </div>

            {language === "en" ? (
              <>
                <p>
                  <strong>Levan Beroshvili</strong> 👨‍💻 — A full-stack software
                  engineer with over 10 years of experience, who has worked at
                  leading international companies, including Microsoft. His
                  expertise covers modern web technologies, building scalable
                  systems, and implementing business logic. He also has
                  experience in business management and deeply understands the
                  challenges of entrepreneurship.
                </p>
                <p>
                  <strong>Ani Beroshvili</strong> — A professional in multiple
                  fields. She has been working in corporate sales since
                  childhood 📊, while also being a software engineer 💻,
                  lecturer 📚, and founder of her own companies. Over the years,
                  she has accumulated knowledge and experience in technology,
                  communication, and business. A mother of three 👩‍👧‍👦, who
                  successfully balances family, career, and creativity in life.
                </p>
                <p>
                  Naturally came a stage when both their diverse interests and
                  professional skills united in one space. From here was born
                  the idea to create such a platform that would really help
                  creative people 🎨 — artists, handmade craftspeople, and
                  entrepreneurs — deliver their work to a wide audience 🌍.
                </p>
                <p>
                  After 7 months of tireless work 🤯, research, and technical
                  development, Levan and Ani together created the platform
                  Soulart.ge — a space that gives artists the opportunity to
                  present themselves, reach customers, and earn income from
                  their work 💸
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>ლევან ბეროშვილი</strong> 👨‍💻 — 10 წელზე მეტი
                  გამოცდილების მქონე სრული სტეკის პროგრამული ინჟინერი, რომელიც
                  მუშაობდა წამყვან უცხოურ კომპანიებში, მათ შორის Microsoft-ში.
                  მისი გამოცდილება მოიცავს თანამედროვე ვებ ტექნოლოგიებს,
                  სკალირებადი სისტემების აგებას და ბიზნეს ლოგიკის
                  განხორციელებას. თავადაც ფლობს ბიზნესის მართვის გამოცდილებას და
                  ღრმად ესმის მეწარმეობის გამოწვევები.
                </p>
                <p>
                  <strong>ანი ბეროშვილი</strong> — პროფესიონალი მრავალმხრივ
                  სფეროში. 15+ გამოცდილებით კორპორატიულ გაყიდვებში 📊,
                  ამავდროულად არის პროგრამული ინჟინერი 💻, ლექტორი 📚 და
                  საკუთარი კომპანიების დამფუძნებელი. წლების განმავლობაში
                  აგროვებდა ცოდნასა და გამოცდილებას როგორც ტექნოლოგიების, ისე
                  კომუნიკაციისა და ბიზნესის მიმართულებით. სამი შვილის დედა 👩‍👧‍👦,
                  რომელიც ცხოვრებაში წარმატებით აბალანსებს ოჯახს, კარიერას და
                  შემოქმედებას.
                </p>
                <p>
                  ბუნებრივად მოვიდა ეტაპი, როცა ორივეს მრავალმხრივი ინტერესები
                  და პროფესიული უნარები ერთ სივრცეში გაერთიანდა. სწორედ აქედან
                  დაიბადა იდეა შეექმნათ ისეთი პლატფორმა, რომელიც რეალურად
                  დაეხმარება შემოქმედ ადამიანებს 🎨 — მხატვრებს, ხელნაკეთ
                  ნივთებზე მომუშავეებს და მეწარმეებს, მიაწვდონ თავიანთი
                  ნამუშევრები ფართო აუდიტორიას 🌍.
                </p>
                <p>
                  7 თვიანი დაუღალავი შრომის 🤯, კვლევისა და ტექნიკური
                  განვითარების შედეგად, ლევანმა და ანიმ ერთად შექმნეს პლატფორმა
                  Soulart.ge — სივრცე, რომელიც ხელოვანებს აძლევს შესაძლებლობას
                  თავი წარმოაჩინონ, მიაღწიონ მომხმარებლამდე და თავიანთი
                  ნამუშევრებით შემოსავალი მიიღონ 💸
                </p>
              </>
            )}
          </div>
          <div className="about-author">
            <div className="author-card">
              <div className="author-avatar">
                <Image src="/avatar.jpg" alt="Ani & Levan Beroshvili" fill />
              </div>
              <div className="author-info">
                <h3>
                  {language === "en"
                    ? "Ani & Levan Beroshvili"
                    : "ანი და ლევან ბეროშვილი"}
                </h3>
                <p>
                  Soulart.ge —{" "}
                  {language === "en" ? "Co-founders" : "თანადამფუძნებლები"}
                </p>
                {language === "en" ? (
                  <p className="author-tags">
                    Software Engineering
                    <br />
                    Business Strategy • Sales Expertise
                    <br />
                    Lecturing • Entrepreneurship
                    <br />
                    Creative Support
                  </p>
                ) : (
                  <p className="author-tags">
                    პროგრამული ინჟინერია
                    <br />
                    ბიზნეს სტრატეგია • გაყიდვების ექსპერტიზა
                    <br />
                    ლექტორობა • მეწარმეობა
                    <br />
                    შემოქმედების მხარდაჭერა
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project Overview */}
      <section className="about-section">
        <h2 className="about-subtitle">
          {language === "en"
            ? "🖼️ Tell us about your project"
            : "🖼️ გვიამბეთ თქვენი პროექტის შესახებ"}
        </h2>
        {language === "en" ? (
          <>
            <p>
              Soulart.ge is a Georgian online platform that brings together
              artists and art lovers 🤝 and creates a space where artists and
              handmade entrepreneurs can:
            </p>
            <ul className="about-list">
              <li>✅ Register completely free</li>
              <li>🛒 Create their own online store</li>
              <li>📸 Upload their works</li>
              <li>💰 Sell them to a wide audience</li>
            </ul>
            <p>
              On Soulart, each artist has their own personal cabinet 🔐, from
              where they easily manage orders, control earned money, and if
              necessary, withdraw directly from the site. In addition, each
              artist can create a personal page with a unique link 🔗 (for
              example: soulart.ge/@your_name), where they present both works for
              sale and their own portfolio. This page functions as a full online
              store that can be shared with friends, on social networks, or with
              potential clients — the whole creative presentation with one link
              🎨✨
            </p>
            <p>
              For buyers, this is a place where from one space they can browse
              and purchase handmade works by different authors 🎁 — without
              additional courier fees.
            </p>
            <p>
              💳 In the near future, installment payment will also be added.
            </p>
            <p>
              Currently, the platform is only available on the Georgian market
              🇬🇪, although technically it is fully operational 🌐 to work with
              foreign customers as well. As soon as we see sufficient interest —
              the platform will also be activated in international mode ✈️.
            </p>
          </>
        ) : (
          <>
            <p>
              Soulart.ge არის ქართული ონლაინ პლატფორმა, რომელიც აერთიანებს
              ხელოვანებსა და ხელოვნების მოყვარულებს 🤝 და ქმნის სივრცეს, სადაც
              მხატვრებსა და ხელნაკეთ ნივთებზე მომუშავე მეწარმეებს შეუძლიათ:
            </p>
            <ul className="about-list">
              <li>✅ სრულიად უფასოდ დარეგისტრირდნენ</li>
              <li>🛒 შექმნან საკუთარი ონლაინ მაღაზია</li>
              <li>📸 ატვირთონ თავიანთი ნამუშევრები</li>
              <li>💰 გაყიდონ ისინი ფართო აუდიტორიისთვის</li>
            </ul>
            <p>
              Soulart-ზე თითოეულ ხელოვანს აქვს საკუთარი პირადი კაბინეტი 🔐,
              საიდანაც მარტივად მართავს შეკვეთებს, აკონტროლებს გამომუშავებულ
              თანხას და საჭიროების შემთხვევაში, პირდაპირ საიტიდანვე გაანაღდებს.
              გარდა ამისა, თითოეულ ხელოვანს შეუძლია შექმნას პერსონალური გვერდი
              უნიკალური ბმულით 🔗 (მაგალითად: soulart.ge/@შენი_სახელი), სადაც
              წარმოაჩენს როგორც გასაყიდ ნამუშევრებს, ისე საკუთარ პორტფოლიოს. ეს
              გვერდი ფუნქციონირებს როგორც სრულფასოვანი ონლაინ მაღაზია, რომელიც
              შეუძლიათ გაუზიარონ მეგობრებს, სოციალურ ქსელებში ან პოტენციურ
              კლიენტებს — ერთი ბმულით მთელი შემოქმედების წარმოჩენა 🎨✨
            </p>
            <p>
              <b>მყიდველებისთვის</b> კი ეს არის ადგილი, სადაც ერთი სივრციდან
              შეუძლიათ დაათვალიერონ და შეიძინონ სხვადასხვა ავტორის ხელნაკეთი
              ნამუშევრები 🎁 — დამატებითი საკურიერო ხარჯის გარეშე.
            </p>
            <p>💳 უახლოეს პერიოდში დაემატება განვადებით გადახდის ფუნქციაც.</p>
            <p>
              ამჟამად პლატფორმა მხოლოდ საქართველოს ბაზარზეა ხელმისაწვდომი 🇬🇪,
              თუმცა ტექნიკურად სრულად გამართულია 🌐, რათა უცხოელ
              მომხმარებლებთანაც ვიმუშაოთ. როგორც კი დავინახავთ საკმარის
              დაინტერესებას — პლატფორმა საერთაშორისო რეჟიმშიც ამოქმედდება ✈️.
            </p>
          </>
        )}
      </section>

      {/* Why unique */}
      <section className="about-section about-highlight about-unique">
        <h2 className="about-subtitle">
          {language === "en"
            ? "🌟 What makes this platform unique?"
            : "🌟 რით არის ეს პლატფორმა გამორჩეული?"}
        </h2>
        {language === "en" ? (
          <>
            <p>
              Soulart.ge is unique in that it is primarily tailored to artists
              🎨.
            </p>
            <ul className="about-list contrast">
              <li>❌ We do not charge a registration fee</li>
              <li>❌ There are no hidden costs</li>
              <li>
                ✅ Only on actual sales is a small commission charged — for
                platform development
              </li>
            </ul>
            <p>
              Soulart unites both professionals and beginners 👩‍🎨🧑‍🎨 — everyone
              who wants to introduce their creativity to a wide audience without
              technical difficulties.
            </p>
            <div className="about-divider" />
            <p className="about-quote">
              We have created a space where the artist feels free 🕊️, and the
              buyer makes choices with confidence and pleasure 🛍️
            </p>
          </>
        ) : (
          <>
            <p>
              Soulart.ge გამორჩეულია იმით, რომ ის პირველ რიგში ხელოვანებზეა
              მორგებული 🎨.
            </p>
            <ul className="about-list contrast">
              <li>❌ არ ვითხოვთ რეგისტრაციის საფასურს</li>
              <li>❌ არ არსებობს ფარული ხარჯები</li>
              <li>
                ✅ მხოლოდ რეალური გაყიდვისას იჭრება მცირე საკომისიო — პლატფორმის
                განვითარებისთვის
              </li>
            </ul>
            <p>
              Soulart აერთიანებს როგორც პროფესიონალებს, ისე დამწყებს 👩‍🎨🧑‍🎨 —
              ყველას, ვისაც სურს, საკუთარი შემოქმედება ფართო აუდიტორიას გააცნოს
              ტექნიკური სირთულეების გარეშე.
            </p>
            <div className="about-divider" />
            <p className="about-quote">
              ჩვენ შევქმენით სივრცე, სადაც ხელოვანი თავს თავისუფლად გრძნობს 🕊️,
              მყიდველი კი — ნდობით და სიამოვნებით აკეთებს არჩევანს 🛍️
            </p>
          </>
        )}
      </section>

      {/* Inspiration */}
      <section className="about-section">
        <h2 className="about-subtitle">
          {language === "en"
            ? "🎨 What was the inspiration for this project?"
            : "🎨 რა იყო ამ პროექტის ინსპირაცია?"}
        </h2>
        {language === "en" ? (
          <>
            <p>
              The inspiration came from personal experience. Ani herself also
              paints, and when she started sharing and selling her works, she
              realized how difficult it was to find an appropriate space.
              Facebook groups and other channels were not sufficient, neither
              functionally nor in terms of reliability.
            </p>
            <p>
              That's exactly why Ani and Levan decided 👩‍💻👨‍💻 to turn their
              technical knowledge into real help and create a professional
              platform with human values 💙
            </p>
          </>
        ) : (
          <>
            <p>
              ინსპირაცია პირადი გამოცდილებიდან მოვიდა. ანი თავადაც ხატავს და
              როცა მისი ნამუშევრების გაზიარება და გაყიდვა დაიწყო, მიხვდა
              რამდენად რთული იყო შესაბამისი სივრცის პოვნა. ფეისბუქ ჯგუფები და
              სხვა არხები საკმარისი არ აღმოჩნდა არც ფუნქციურად, არც სანდოობის
              თვალსაზრისით.
            </p>
            <p>
              სწორედ ამიტომ გადაწყვიტეს, ანიმ და ლევანმა 👩‍💻👨‍💻 მათი ტექნიკური
              ცოდნა რეალურ დახმარებად გადაექციათ და შეექმნათ პროფესიონალური
              პლატფორმა ადამიანური ღირებულებებით 💙
            </p>
          </>
        )}
      </section>

      {/* FAQ-like snippets */}
      <section className="about-section">
        <h2 className="about-subtitle">
          {language === "en"
            ? "👥 Can only artists register and is it paid?"
            : "👥 მხოლოდ მხატვრები შეძლებენ რეგისტრაციას და ფასიანია?"}
        </h2>
        {language === "en" ? (
          <>
            <p>
              No — Soulart.ge is open to everyone who creates unique handmade
              items ✂️🧵🖌️ — whether it's a painter, ceramicist, textile master,
              or others.
            </p>
            <ul className="about-list">
              <li>🆓 Registration and product placement is completely free</li>
              <li>❌ There are no hidden fees</li>
              <li>💰 Only a small commission is charged at the time of sale</li>
            </ul>
            <p>Our main goal is — to support and empower artists 💪</p>
          </>
        ) : (
          <>
            <p>
              არა — Soulart.ge ღიაა ყველასთვის, ვინც ქმნის უნიკალურ ხელნაკეთ
              ნივთებს ✂️🧵🖌️ — იქნება ეს მხატვარი, კერამიკოსი, ქსოვილის ოსტატი
              თუ სხვა.
            </p>
            <ul className="about-list">
              <li>🆓 რეგისტრაცია და პროდუქციის განთავსება სრულიად უფასოა</li>
              <li>❌ არ არსებობს ფარული გადასახადები</li>
              <li>💰 მხოლოდ გაყიდვის დროს იჭრება მცირე საკომისიო</li>
            </ul>
            <p>
              ჩვენი მთავარი მიზანია — ხელოვანების მხარდაჭერა და გაძლიერება 💪
            </p>
          </>
        )}
      </section>

      <section className="about-section">
        <h2 className="about-subtitle">
          {language === "en"
            ? "🧠 What themes dominate Georgian art?"
            : "🧠 რა თემატიკა სჭარბობს ქართულ მხატვრობაში?"}
        </h2>
        {language === "en" ? (
          <>
            <p>In today's Georgian painting, you can feel:</p>
            <ul className="about-list">
              <li>🌿 Love of nature</li>
              <li>💫 Spirituality</li>
              <li>❤️ Emotional expression</li>
              <li>🔎 Dialogue with oneself</li>
            </ul>
            <p>
              And Soulart.ge is a kind of digital collection of these feelings —
              where artists show what is important to them and what lives within
              them ✨
            </p>
          </>
        ) : (
          <>
            <p>დღევანდელ ქართულ ფერწერაში იგრძნობა:</p>
            <ul className="about-list">
              <li>🌿 ბუნების სიყვარული</li>
              <li>💫 სულიერება</li>
              <li>❤️ ემოციური გამოხატულება</li>
              <li>🔎 საკუთარ თავთან დიალოგი</li>
            </ul>
            <p>
              Soulart.ge კი ამ განცდების ერთგვარი ციფრული კოლექციაა — სადაც
              ხელოვანები აჩვენებენ იმას, რაც მათთვის მნიშვნელოვანია და რაც მათში
              ცხოვრობს ✨
            </p>
          </>
        )}
      </section>

      {/* Closing call-to-action */}
      <section className="about-section about-cta">
        <h2 className="about-subtitle">
          {language === "en" ? "✅ In conclusion..." : "✅ დასასრულს..."}
        </h2>
        {language === "en" ? (
          <>
            <p>
              Soulart.ge is not just a website — it is a platform created with
              heart that brings people together, simplifies the sharing of
              creativity, and creates real opportunities.
            </p>
            <p>
              We believe that talent should be recognized — and Soulart is
              exactly the guide for that ✨
            </p>
          </>
        ) : (
          <>
            <p>
              Soulart.ge არ არის უბრალოდ ვებსაიტი — ის არის გულისხმით შექმნილი
              პლატფორმა, რომელიც აერთიანებს ადამიანებს, ამარტივებს შემოქმედების
              გაზიარებას და ქმნის რეალურ შესაძლებლობებს.
            </p>
            <p>
              ჩვენ გვჯერა, რომ ნიჭი უნდა იყოს აღიარებული — და Soulart სწორედ
              ამის გზამკვლევია ✨
            </p>
          </>
        )}
        <div className="about-cta-buttons">
          <Link
            href="/sellers-register"
            className="about-button about-seller-button"
          >
            {language === "en"
              ? "Join us as a creator"
              : "შემოგვიერთდი როგორც შემოქმედი"}
          </Link>
          <Link href="/shop" className="about-button about-shop-button">
            {language === "en" ? "Browse works" : "დაათვალიერე ნამუშევრები"}
          </Link>
        </div>
      </section>

      {/* Existing i18n sections retained below if needed */}
      <section className="about-section hidden-i18n">
        <h2 className="about-subtitle">{t("about.mission.title")}</h2>
        <p>{t("about.mission.description")}</p>
      </section>
      <section className="about-section hidden-i18n">
        <h2 className="about-subtitle">{t("about.goal.title")}</h2>
        <p>{t("about.goal.description")}</p>
      </section>
      <section className="about-section hidden-i18n">
        <h2 className="about-subtitle">{t("about.vision.title")}</h2>
        <p>{t("about.vision.description")}</p>
      </section>
    </div>
  );
}
