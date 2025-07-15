"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import "./privacy-policy.css";

export default function PrivacyPolicy() {
  const { language } = useLanguage();

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-content">
        <h1 className="privacy-policy-title">
          {language === "en" ? "Privacy Policy" : "კონფიდენციალურობის პოლიტიკა"}
        </h1>

        <div className="privacy-section">
          <h2>
            {language === "en"
              ? "Information Collection"
              : "ინფორმაციის შეგროვება"}
          </h2>
          <p>
            {language === "en"
              ? "We collect information you provide directly to us when you create an account, purchase handmade artworks or paintings, list your art for sale, or contact us. This includes your name, email address, phone number, shipping address, payment information, and artwork details."
              : "თქვენგან ვაგროვებთ იმ ინფორმაციას, რომელსაც პირდაპირ გვაწვდით — როცა ქმნით ანგარიშს, ყიდულობთ ხელნაკეთ ნაწარმოებებს ან ნახატებს, იტვირთავთ თქვენს ნამუშევრებს გასაყიდად, ან გვიკავშირდებით. ეს შეიძლება მოიცავდეს თქვენს სახელს, ელფოსტის მისამართს, ტელეფონის ნომერს, მიწოდების მისამართს, გადახდის ინფორმაციას და ნამუშევრის დეტალებს."}
          </p>
        </div>

        <div className="privacy-section">
          <h2>
            {language === "en"
              ? "How We Use Your Information"
              : "როგორ ვიყენებთ თქვენს ინფორმაციას"}
          </h2>
          <ul>
            <li>
              {language === "en"
                ? "Process and fulfill your orders for handmade artwork and paintings"
                : "ხელნაკეთი ნაწარმოებისა და ნახატების შეკვეთების დამუშავება და შესრულება"}
            </li>
            <li>
              {language === "en"
                ? "Connect artists and buyers on our marketplace"
                : "ხელოვანებისა და მყიდველების დაკავშირება ჩვენს მარკეტპლეისზე"}
            </li>
            <li>
              {language === "en"
                ? "Send you order confirmations and shipping updates"
                : "შეკვეთის დადასტურების და მიწოდების განახლებების გაგზავნა"}
            </li>
            <li>
              {language === "en"
                ? "Provide customer support for both buyers and sellers"
                : "მომხმარებლისა და მყიდველების მხარდაჭერის უზრუნველყოფა"}
            </li>
            <li>
              {language === "en"
                ? "Improve our platform and art marketplace services"
                : "ჩვენი პლატფორმისა და ხელოვნების მარკეტპლეისის სერვისების გაუმჯობესება"}
            </li>
            <li>
              {language === "en"
                ? "Send promotional emails about new artworks (with your consent)"
                : "სარეკლამო ელფოსტების გაგზავნა ახალი ნამუშევრების შესახებ (თქვენი თანხმობით)"}
            </li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>
            {language === "en"
              ? "Information Sharing"
              : "ინფორმაციის გაზიარება"}
          </h2>
          <p>
            {language === "en"
              ? "We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who help us operate our art marketplace, such as payment processors, shipping companies, and artwork authentication services, but only to the extent necessary to provide our services."
              : "ჩვენ არ ვყიდით, არ ვცვლით და არ ვაქირავებთ თქვენს პირად ინფორმაციას მესამე მხარეებისთვის. შეიძლება გავაზიაროთ თქვენი ინფორმაცია სანდო სერვის პროვაიდერებთან, რომლებიც გვეხმარებიან ჩვენი ხელოვნების მარკეტპლეისის მართვაში, როგორიცაა გადახდის დამუშავების კომპანიები, მიწოდების სერვისები და ნამუშევრების ავთენტიფიკაციის სერვისები, მაგრამ მხოლოდ იმ ფარგლებში, რომელიც საჭიროა ჩვენი სერვისების უზრუნველსაყოფად."}
          </p>
        </div>

        <div className="privacy-section">
          <h2>
            {language === "en" ? "Data Security" : "მონაცემთა უსაფრთხოება"}
          </h2>
          <p>
            {language === "en"
              ? "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure."
              : "ჩვენ ვახორციელებთ შესაბამის უსაფრთხოების ზომებს თქვენი პირადი ინფორმაციის დასაცავად უნებართვო წვდომისგან, შეცვლისგან, გამჟღავნებისგან ან განადგურებისგან. თუმცა, ინტერნეტით გადაცემის არცერთი მეთოდი არ არის 100% უსაფრთხო."}
          </p>
        </div>

        <div className="privacy-section">
          <h2>{language === "en" ? "Cookies" : "ქუქიები"}</h2>
          <p>
            {language === "en"
              ? "Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze website traffic. You can disable cookies in your browser settings, but this may affect the functionality of our website."
              : "ჩვენი ვებსაიტი იყენებს ქუქიებს თქვენი დათვალიერების გამოცდილების გასაუმჯობესებლად, თქვენი პრეფერენსების დასამახსოვრებლად და ვებსაიტის ტრაფიკის გასაანალიზებლად. შეგიძლიათ გამორთოთ ქუქიები თქვენი ბრაუზერის პარამეტრებში, მაგრამ ეს შეიძლება იმოქმედოს ჩვენი ვებსაიტის ფუნქციონალზე."}
          </p>
        </div>

        <div className="privacy-section">
          <h2>{language === "en" ? "Your Rights" : "თქვენი უფლებები"}</h2>
          <p>
            {language === "en"
              ? "You have the right to access, update, or delete your personal information. You can also unsubscribe from promotional emails at any time. To exercise these rights, please contact us using the information provided below."
              : "გაქვთ უფლება, იხილოთ, განაახლოთ ან წაშალოთ თქვენი პირადი ინფორმაცია. ასევე შეგიძლიათ ნებისმიერ დროს გააუქმოთ სარეკლამო ელფოსტების მიღება. აღნიშნული უფლებების გამოსაყენებლად, გთხოვთ დაგვიკავშირდეთ ქვემოთ მოცემული საკონტაქტო ინფორმაციის გამოყენებით."}
          </p>
        </div>

        <div className="privacy-section">
          <h2>
            {language === "en"
              ? "Contact Information"
              : "საკონტაქტო ინფორმაცია"}
          </h2>
          <p>
            {language === "en"
              ? "If you have any questions about this Privacy Policy, please contact us at:"
              : "თუ გაქვთ რაიმე კითხვა ამ კონფიდენციალურობის პოლიტიკასთან დაკავშირებით, გთხოვთ დაგვიკავშირდეთ:"}
          </p>
          <div className="contact-info">
            <p>Email: info@soulart.ge</p>
            <p>
              {language === "en"
                ? "Phone: +995 551 00 00 59"
                : "ტელეფონი: +995 551 00 00 59"}
            </p>
            <p>
              {language === "en"
                ? "Address: Tbilisi, Georgia"
                : "მისამართი: თბილისი, საქართველო"}
            </p>
          </div>
        </div>

        <div className="privacy-section">
          <h2>
            {language === "en"
              ? "Changes to This Policy"
              : "ცვლილებები ამ პოლიტიკაში"}
          </h2>
          <p>
            {language === "en"
              ? "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the effective date."
              : "ჩვენ შეიძლება პერიოდულად განვაახლოთ კონფიდენციალურობის პოლიტიკა. ჩვენ შეგატყობინებთ ნებისმიერი ცვლილების შესახებ ამ გვერდზე ახალი კონფიდენციალურობის პოლიტიკის განთავსებით და ამოქმედების თარიღის განახლებით."}
          </p>
        </div>

        <div className="effective-date">
          <p>
            <strong>
              {language === "en"
                ? "Effective Date: July 15, 2025"
                : "ამოქმედების თარიღი: 15 ივლისი, 2025"}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}
