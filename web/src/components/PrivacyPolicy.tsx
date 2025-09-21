"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useEffect } from "react";

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function PrivacyPolicy({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}: PrivacyPolicyProps) {
  const { language } = useLanguage();

  // Modal-ის დახურვისთვის როცა component unmount-ხდება
  useEffect(() => {
    return () => {
      // Cleanup function - დამატებითი უსაფრთხოება
      if (isOpen) {
        document.body.style.overflow = "unset";
      }
    };
  }, [isOpen]);

  // ESC ღილაკით დახურვისთვის
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Background scroll-ის აღკვეთა
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      // შევქმნათ print-ისთვის განკუთვნილი ფანჯარა
      const printWindow = window.open("", "_blank");
      const contractContent = document.querySelector(".privacy-content");

      if (printWindow && contractContent) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${
              language === "ge"
                ? "კონფიდენციალურობის პოლიტიკა - SoulArt.ge"
                : "Privacy Policy - SoulArt.ge"
            }</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 20px;
                color: #333;
              }
              h1, h2, h3, h4 {
                color: #2c3e50;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              h1 {
                text-align: center;
                font-size: 24px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
              }
              h4 {
                font-size: 16px;
                font-weight: bold;
              }
              p {
                margin-bottom: 10px;
                text-align: justify;
              }
              ul {
                margin: 10px 0;
                padding-left: 20px;
              }
              li {
                margin-bottom: 5px;
              }
              strong {
                font-weight: bold;
              }
              .header-info {
                text-align: center;
                margin-bottom: 30px;
                font-size: 12px;
                color: #666;
              }
              .contact-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #7b5642;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>${
              language === "ge"
                ? "კონფიდენციალურობის პოლიტიკა"
                : "Privacy Policy"
            }</h1>
            <div class="header-info">
              <p><strong>SoulArt.ge</strong> - ${
                language === "ge"
                  ? "პლატფორმის კონფიდენციალურობის პოლიტიკა"
                  : "Platform Privacy Policy"
              }</p>
              <p>${
                language === "ge"
                  ? "ამოქმედების თარიღი: 15 ივლისი, 2025"
                  : "Effective Date: July 15, 2025"
              }</p>
            </div>
            ${contractContent.innerHTML}
          </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        // Print dialog-ის ავტომატური გაშვება
        setTimeout(() => {
          printWindow.print();
        }, 100);
      } else {
        console.error("Could not open print window or find privacy content");
      }
    } catch (error) {
      console.error("Error in handleDownload:", error);
    }
  };

  return (
    <div
      className="contract-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="contract-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          zIndex: 1000,
          color: "var(--primary-color, #012645)",
        }}
      >
        <div
          className="contract-header"
          style={{
            padding: "20px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {language === "ge"
              ? "კონფიდენციალურობის პოლიტიკა"
              : "Privacy Policy"}
          </h3>
          <div className="contract-header-actions">
            <button
              onClick={handleDownload}
              style={{
                background: "#7b5642",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
                marginRight: "10px",
                display: "flex",
              }}
            >
              📄 {language === "ge" ? "ბეჭდვა/გადმოწერა" : "Print/Download"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          className="privacy-content"
          style={{
            padding: "20px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>
              {language === "ge"
                ? "SoulArt.ge კონფიდენციალურობის პოლიტიკა"
                : "SoulArt.ge Privacy Policy"}
            </h4>
            <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
              {language === "ge"
                ? "ამოქმედების თარიღი: 15 ივლისი, 2025"
                : "Effective Date: July 15, 2025"}
            </p>
          </div>

          {language === "ge" ? (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h4>ინფორმაციის შეგროვება</h4>
                <p>
                  თქვენგან ვაგროვებთ იმ ინფორმაციას, რომელსაც პირდაპირ გვაწვდით
                  — როცა ქმნით ანგარიშს, ყიდულობთ ხელნაკეთ ნაწარმოებებს ან
                  ნახატებს, იტვირთავთ თქვენს ნამუშევრებს გასაყიდად, ან
                  გვიკავშირდებით. ეს შეიძლება მოიცავდეს თქვენს სახელს, ელფოსტის
                  მისამართს, ტელეფონის ნომერს, მიწოდების მისამართს, გადახდის
                  ინფორმაციას და ნამუშევრის დეტალებს.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>როგორ ვიყენებთ თქვენს ინფორმაციას</h4>
                <ul>
                  <li>
                    ხელნაკეთი ნაწარმოებისა და ნახატების შეკვეთების დამუშავება და
                    შესრულება
                  </li>
                  <li>
                    ხელოვანებისა და მყიდველების დაკავშირება ჩვენს მარკეტპლეისზე
                  </li>
                  <li>
                    შეკვეთის დადასტურების და მიწოდების განახლებების გაგზავნა
                  </li>
                  <li>მომხმარებლისა და მყიდველების მხარდაჭერის უზრუნველყოფა</li>
                  <li>
                    ჩვენი პლატფორმისა და ხელოვნების მარკეტპლეისის სერვისების
                    გაუმჯობესება
                  </li>
                  <li>
                    სარეკლამო ელფოსტების გაგზავნა ახალი ნამუშევრების შესახებ
                    (თქვენი თანხმობით)
                  </li>
                </ul>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>ინფორმაციის გაზიარება</h4>
                <p>
                  ჩვენ არ ვყიდით, არ ვცვლით და არ ვაქირავებთ თქვენს პირად
                  ინფორმაციას მესამე მხარეებისთვის. შეიძლება გავაზიაროთ თქვენი
                  ინფორმაცია სანდო სერვის პროვაიდერებთან, რომლებიც გვეხმარებიან
                  ჩვენი ხელოვნების მარკეტპლეისის მართვაში, როგორიცაა გადახდის
                  დამუშავების კომპანიები, მიწოდების სერვისები და ნამუშევრების
                  ავთენტიფიკაციის სერვისები, მაგრამ მხოლოდ იმ ფარგლებში, რომელიც
                  საჭიროა ჩვენი სერვისების უზრუნველსაყოფად.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>მონაცემთა უსაფრთხოება</h4>
                <p>
                  ჩვენ ვახორციელებთ შესაბამის უსაფრთხოების ზომებს თქვენი პირადი
                  ინფორმაციის დასაცავად უნებართვო წვდომისგან, შეცვლისგან,
                  გამჟღავნებისგან ან განადგურებისგან. თუმცა, ინტერნეტით
                  გადაცემის არცერთი მეთოდი არ არის 100% უსაფრთხო.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>ქუქიები</h4>
                <p>
                  ჩვენი ვებსაიტი იყენებს ქუქიებს თქვენი დათვალიერების
                  გამოცდილების გასაუმჯობესებლად, თქვენი პრეფერენსების
                  დასამახსოვრებლად და ვებსაიტის ტრაფიკის გასაანალიზებლად.
                  შეგიძლიათ გამორთოთ ქუქიები თქვენი ბრაუზერის პარამეტრებში,
                  მაგრამ ეს შეიძლება იმოქმედოს ჩვენი ვებსაიტის ფუნქციონალზე.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>თქვენი უფლებები</h4>
                <p>
                  გაქვთ უფლება, იხილოთ, განაახლოთ ან წაშალოთ თქვენი პირადი
                  ინფორმაცია. ასევე შეგიძლიათ ნებისმიერ დროს გააუქმოთ სარეკლამო
                  ელფოსტების მიღება. აღნიშნული უფლებების გამოსაყენებლად, გთხოვთ
                  დაგვიკავშირდეთ ქვემოთ მოცემული საკონტაქტო ინფორმაციის
                  გამოყენებით.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>საკონტაქტო ინფორმაცია</h4>
                <p>
                  თუ გაქვთ რაიმე კითხვა ამ კონფიდენციალურობის პოლიტიკასთან
                  დაკავშირებით, გთხოვთ დაგვიკავშირდეთ:
                </p>
                <div
                  className="contact-info"
                  style={{
                    background: "#f8f9fa",
                    padding: "15px",
                    borderRadius: "8px",
                    borderLeft: "4px solid var(--secondary-color)",
                    marginTop: "10px",
                  }}
                >
                  <p style={{ margin: "5px 0" }}>📧 info@soulart.ge</p>
                  <p style={{ margin: "5px 0" }}>📞 +995 551 00 00 59</p>
                  <p style={{ margin: "5px 0" }}>📍 თბილისი, საქართველო</p>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>ცვლილებები ამ პოლიტიკაში</h4>
                <p>
                  ჩვენ შეიძლება პერიოდულად განვაახლოთ კონფიდენციალურობის
                  პოლიტიკა. ჩვენ შეგატყობინებთ ნებისმიერი ცვლილების შესახებ ამ
                  გვერდზე ახალი კონფიდენციალურობის პოლიტიკის განთავსებით და
                  ამოქმედების თარიღის განახლებით.
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h4>Information Collection</h4>
                <p>
                  We collect information you provide directly to us when you
                  create an account, purchase handmade artworks or paintings,
                  list your art for sale, or contact us. This includes your
                  name, email address, phone number, shipping address, payment
                  information, and artwork details.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>How We Use Your Information</h4>
                <ul>
                  <li>
                    Process and fulfill your orders for handmade artwork and
                    paintings
                  </li>
                  <li>Connect artists and buyers on our marketplace</li>
                  <li>Send you order confirmations and shipping updates</li>
                  <li>Provide customer support for both buyers and sellers</li>
                  <li>Improve our platform and art marketplace services</li>
                  <li>
                    Send promotional emails about new artworks (with your
                    consent)
                  </li>
                </ul>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Information Sharing</h4>
                <p>
                  We do not sell, trade, or rent your personal information to
                  third parties. We may share your information with trusted
                  service providers who help us operate our art marketplace,
                  such as payment processors, shipping companies, and artwork
                  authentication services, but only to the extent necessary to
                  provide our services.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Data Security</h4>
                <p>
                  We implement appropriate security measures to protect your
                  personal information against unauthorized access, alteration,
                  disclosure, or destruction. However, no method of transmission
                  over the internet is 100% secure.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Cookies</h4>
                <p>
                  Our website uses cookies to enhance your browsing experience,
                  remember your preferences, and analyze website traffic. You
                  can disable cookies in your browser settings, but this may
                  affect the functionality of our website.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Your Rights</h4>
                <p>
                  You have the right to access, update, or delete your personal
                  information. You can also unsubscribe from promotional emails
                  at any time. To exercise these rights, please contact us using
                  the information provided below.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Contact Information</h4>
                <p>
                  If you have any questions about this Privacy Policy, please
                  contact us at:
                </p>
                <div
                  className="contact-info"
                  style={{
                    background: "#f8f9fa",
                    padding: "15px",
                    borderRadius: "8px",
                    borderLeft: "4px solid #7b5642",
                    marginTop: "10px",
                  }}
                >
                  <p style={{ margin: "5px 0" }}>📧 info@soulart.ge</p>
                  <p style={{ margin: "5px 0" }}>📞 +995 551 00 00 59</p>
                  <p style={{ margin: "5px 0" }}>📍 Tbilisi, Georgia</p>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>Changes to This Policy</h4>
                <p>
                  We may update this Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the effective date.
                </p>
              </div>
            </>
          )}
        </div>

        {showAcceptButton && (
          <div
            className="contract-footer"
            style={{
              padding: "20px",
              borderTop: "1px solid #eee",
              textAlign: "center",
            }}
          >
            <button
              onClick={onAccept}
              style={{
                background: "#7b5642",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {language === "ge" ? "ვეთანხმები პოლიტიკას" : "I Agree to Policy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
