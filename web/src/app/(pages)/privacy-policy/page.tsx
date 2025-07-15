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
              ? "We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. This includes your name, email address, phone number, shipping address, and payment information."
              : "თქვენგან ვაგროვებთ იმ ინფორმაციას, რომელსაც პირდაპირ გვაწვდით — მაგალითად, როცა ქმნით ანგარიშს, ასრულებთ შეძენას ან გვიკავშირდებით. ეს შეიძლება მოიცავდეს თქვენს სახელს, ელფოსტის მისამართს, ტელეფონის ნომერს, მიწოდების მისამართს და გადახდის ინფორმაციას."}
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
                ? "Process and fulfill your orders"
                : "თქვენი შეკვეთების დამუშავება და შესრულება"}
            </li>
            <li>
              {language === "en"
                ? "Send you order confirmations and shipping updates"
                : "შეკვეთის დადასტურების და მიწოდების განახლებების გაგზავნა"}
            </li>
            <li>
              {language === "en"
                ? "Provide customer support"
                : "მომხმარებლის მხარდაჭერის უზრუნველყოფა"}
            </li>
            <li>
              {language === "en"
                ? "Improve our website and services"
                : "ჩვენი ვებსაიტის და სერვისების გაუმჯობესება"}
            </li>
            <li>
              {language === "en"
                ? "Send promotional emails (with your consent)"
                : "სარეკლამო ელფოსტების გაგზავნა (თქვენი თანხმობით)"}
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
              ? "We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who help us operate our business, such as payment processors and shipping companies, but only to the extent necessary to provide our services."
              : "ჩვენ არ ვყიდით, არ ვცვლით და არ ვაქირავებთ თქვენს პირად ინფორმაციას მესამე მხარეებისთვის. შეიძლება გავაზიაროთ თქვენი ინფორმაცია სანდო სერვის პროვაიდერებთან, რომლებიც გვეხმარებიან ჩვენი ბიზნესის მართვაში, როგორიცაა გადახდის დამუშავებისა და მიწოდების კომპანიები, მაგრამ მხოლოდ იმ ფარგლებში, რომელიც საჭიროა ჩვენი სერვისების უზრუნველსაყოფად."}
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
            <p>Email: info@myhunter.ge</p>
            <p>
              {language === "en"
                ? "Phone: +995 555 123 456"
                : "ტელეფონი: +995 555 123 456"}
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
                ? "Effective Date: January 1, 2025"
                : "ამოქმედების თარიღი: 1 ივნისი, 2025"}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}
