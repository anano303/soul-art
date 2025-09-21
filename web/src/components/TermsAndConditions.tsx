"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useEffect } from "react";

interface TermsAndConditionsProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function TermsAndConditions({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}: TermsAndConditionsProps) {
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
      const contractContent = document.querySelector(".contract-content");

      if (printWindow && contractContent) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${
              language === "ge"
                ? "წესები და პირობები - SoulArt.ge"
                : "Terms and Conditions - SoulArt.ge"
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
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>${
              language === "ge"
                ? "საიტის გამოყენების წესები და პირობები"
                : "Website Terms and Conditions"
            }</h1>
            <div class="header-info">
              <p><strong>SoulArt.ge</strong> - ${
                language === "ge"
                  ? "პლატფორმის გამოყენების პირობები"
                  : "Platform Terms of Use"
              }</p>
              <p>${
                language === "ge" ? "ბოლო განახლების თარიღი:" : "Last updated:"
              } ${new Date().toLocaleDateString(
          language === "ge" ? "ka-GE" : "en-US"
        )}</p>
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
        console.error("Could not open print window or find contract content");
      }
    } catch (error) {
      console.error("Error in handleDownload:", error);
    }
  };

  return (
    <div className="contract-modal-overlay" onClick={onClose}>
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
              ? "საიტის გამოყენების წესები და პირობები"
              : "Website Terms and Conditions"}
          </h3>
          <div className="contract-header-actions">
            <button
              onClick={handleDownload}
              style={{
                background: "var(--secondary-color)",
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
          className="contract-content"
          style={{
            padding: "20px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>
              {language === "ge"
                ? "SoulArt.ge საიტის გამოყენების წესები და პირობები"
                : "SoulArt.ge Website Terms and Conditions"}
            </h4>
            <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
              {language === "ge"
                ? "ბოლო განახლების თარიღი: "
                : "Last updated: "}
              {new Date().toLocaleDateString(
                language === "ge" ? "ge-GE" : "en-US"
              )}
            </p>
          </div>

          {language === "ge" ? (
            <>
              <div style={{ fontStyle: "italic", marginBottom: "20px" }}>
                <p>
                  ამ საიტის (&quot;სოულარტი&quot;) გამოყენებით, თქვენ ეთანხმებით
                  ქვემოთ ჩამოთვლილ პირობებს. ეს პირობები ვრცელდება როგორც
                  გამყიდველებზე, ასევე მომხმარებლებზე. გთხოვთ, ყურადღებით
                  გაეცნოთ.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>1. ზოგადი პირობები</h4>
                <p>
                  <strong>1.1.</strong> საიტის მფლობელი: სოულარტი (შემდგომში
                  &quot;პლატფორმა&quot;) უზრუნველყოფს ონლაინ სივრცეს, სადაც
                  გამყიდველებს შეუძლიათ განათავსონ და გაყიდონ პროდუქცია, ხოლო
                  მომხმარებლებს – შეიძინონ.
                </p>
                <p>
                  <strong>1.2.</strong> საიტის გამოყენებით, ყველა მხარე
                  ადასტურებს, რომ არის მოქმედი სამართლებრივი უნარის მქონე პირი
                  და მიიღებს პასუხისმგებლობას საკუთარ მოქმედებებზე.
                </p>
                <p>
                  <strong>1.3.</strong> პლატფორმა უფლებას იტოვებს ნებისმიერ დროს
                  განაახლოს ან შეცვალოს პირობები წინასწარი გაფრთხილების გარეშე.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>2. რეგისტრაცია და ანგარიშები</h4>
                <p>
                  <strong>2.1.</strong> გამყიდველმა უნდა უზრუნველყოს ზუსტი და
                  სრულყოფილი ინფორმაცია რეგისტრაციისას.
                </p>
                <p>
                  <strong>2.2.</strong> აკრძალულია ერთზე მეტი ანგარიშის შექმნა
                  ერთი და იმავე პირის მიერ გამყიდველის სტატუსით, თუ პლატფორმა
                  წინასწარ არ დაამტკიცებს.
                </p>
                <p>
                  <strong>2.3.</strong> ანგარიშის მონაცემების არასწორად
                  მითითების შემთხვევაში, პლატფორმას აქვს უფლება შეზღუდოს ან
                  გააუქმოს ანგარიში.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>3. გამყიდველების ვალდებულებები</h4>
                <p>
                  <strong>3.1.</strong> გამყიდველი ვალდებულია უზრუნველყოს
                  პროდუქციის აღწერა, ფოტოები და ფასები ზუსტად.
                </p>
                <p>
                  <strong>3.2.</strong> პროდუქცია უნდა აკმაყოფილებდეს მოქმედ
                  კანონმდებლობას და არ უნდა იყოს აკრძალული ან სამართლებრივად
                  შეზღუდული.
                </p>
                <p>
                  <strong>3.3.</strong> გამყიდველი პასუხისმგებელია პროდუქციის
                  დროულ და უსაფრთხო გაგზავნაზე.
                </p>
                <p>
                  <strong>3.4.</strong> პლატფორმას უფლება აქვს დააწესოს
                  საკომისიო ან პროცენტი ყოველი გაყიდვიდან, რაც წინასწარ იქნება
                  განსაზღვრული საიტზე ან შეთანხმებაში.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>4. მომხმარებელთა ვალდებულებები</h4>
                <p>
                  <strong>4.1.</strong> მომხმარებელმა უნდა უზრუნველყოს ზუსტი
                  მიწოდების მისამართი და საკონტაქტო ინფორმაცია.
                </p>
                <p>
                  <strong>4.2.</strong> პროდუქციის შეკვეთისას მომხმარებელი
                  ვალდებულია დროულად გადაიხადოს სრული თანხა მითითებული პირობების
                  შესაბამისად.
                </p>
                <p>
                  <strong>4.3.</strong> მომხმარებელს ეკრძალება პლატფორმის
                  გამოყენება თაღლითური ან არამართლზომიერი მიზნებით.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>5. დაბრუნების და გაცვლის პირობები</h4>
                <p>
                  <strong>5.1.</strong> მომხმარებელს აქვს უფლება უარი თქვას
                  შეძენილ პროდუქტზე და მოითხოვოს დაბრუნება საქართველოს
                  კანონმდებლობის შესაბამისად (14 კალენდარული დღის განმავლობაში
                  პროდუქციის მიღებიდან), თუ პროდუქტი არ არის გამოყენებული და
                  ინახება პირვანდელ მდგომარეობაში.
                </p>
                <p>
                  <strong>5.2.</strong> დაბრუნების ხარჯები, გარდა შემთხვევებისა,
                  როცა პროდუქტი იყო დაზიანებული ან არასწორი, ფარავს
                  მომხმარებელი.
                </p>
                <p>
                  <strong>5.3.</strong> თანხის დაბრუნება განხორციელდება იმავე
                  გზით, რომლითაც მოხდა გადახდა, თუ სხვა რამ არ იქნება
                  შეთანხმებული მხარეებს შორის.
                </p>
                <p>
                  <strong>5.4.</strong> ზოგიერთი კატეგორიის პროდუქცია (მაგ.:
                  პირადი ჰიგიენის ნივთები, საკვები პროდუქტები, ინდივიდუალურად
                  დამზადებული პროდუქცია) დაბრუნებას არ ექვემდებარება, თუ არ არის
                  დეფექტური.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>6. გადახდები და საკომისიო</h4>
                <p>
                  <strong>6.1.</strong> პლატფორმა იღებს საკომისიოს ან პროცენტს
                  ყოველი წარმატებული გაყიდვიდან, რაც წინასწარ იქნება მითითებული
                  პირობებში.
                </p>
                <p>
                  <strong>6.2.</strong> საკომისიოს ოდენობა და გადახდის ვადები
                  განთავსდება საიტზე და შეიძლება შეიცვალოს წინასწარი
                  შეტყობინებით.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>7. პასუხისმგებლობის შეზღუდვა</h4>
                <p>
                  <strong>7.1.</strong> პლატფორმა არ არის პასუხისმგებელი
                  გამყიდველსა და მომხმარებელს შორის წარმოშობილ დავებზე, გარდა იმ
                  შემთხვევებისა, როცა ეს პირდაპირ არის გათვალისწინებული კანონით.
                </p>
                <p>
                  <strong>7.2.</strong> პლატფორმა არ უზრუნველყოფს პროდუქციის
                  ხარისხის ან შესაბამისობის გარანტიას, გარდა გამყიდველის მიერ
                  გაცემული გარანტიისა.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>8. კონფიდენციალურობა</h4>
                <p>
                  <strong>8.1.</strong> მომხმარებელთა და გამყიდველთა პერსონალური
                  მონაცემები დამუშავდება მოქმედი კანონმდებლობის შესაბამისად და
                  გამოყენებული იქნება მხოლოდ მომსახურების მიწოდების მიზნით.
                </p>
                <p>
                  <strong>8.2.</strong> დეტალური ინფორმაცია პერსონალური
                  მონაცემების დამუშავებაზე მოცემულია კონფიდენციალურობის
                  პოლიტიკაში.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>9. გამოყენების შეწყვეტა</h4>
                <p>
                  <strong>9.1.</strong> პლატფორმას უფლება აქვს შეწყვიტოს ან
                  შეაჩეროს ანგარიშის მოქმედება ნებისმიერი პირის მიმართ, რომელიც
                  არღვევს წესებსა და პირობებს.
                </p>
                <p>
                  <strong>9.2.</strong> ანგარიშის გაუქმების შემთხვევაში,
                  ვალდებულებები, რომლებიც წარმოიშვა პირობების დარღვევამდე,
                  ძალაში რჩება.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>10. საკონტაქტო ინფორმაცია</h4>
                <p>
                  ყველა შეკითხვასა და დავასთან დაკავშირებით, შეგიძლიათ
                  დაგვიკავშირდეთ:
                </p>
                <p>📧 support@soulart.ge</p>
                <p>📍 თბილისი, საქართველო</p>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontStyle: "italic", marginBottom: "20px" }}>
                <p>
                  By using this website (&quot;SoulArt&quot;), you agree to the
                  terms and conditions listed below. These terms apply to both
                  sellers and users. Please read carefully.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>1. General Terms</h4>
                <p>
                  <strong>1.1.</strong> Website Owner: SoulArt (hereinafter
                  &quot;Platform&quot;) provides an online space where sellers
                  can list and sell products, and users can purchase them.
                </p>
                <p>
                  <strong>1.2.</strong> By using the website, all parties
                  confirm that they are legally competent individuals and take
                  responsibility for their actions.
                </p>
                <p>
                  <strong>1.3.</strong> The platform reserves the right to
                  update or change terms at any time without prior notice.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>2. Registration and Accounts</h4>
                <p>
                  <strong>2.1.</strong> Sellers must provide accurate and
                  complete information during registration.
                </p>
                <p>
                  <strong>2.2.</strong> Creating multiple accounts by the same
                  person with seller status is prohibited unless pre-approved by
                  the platform.
                </p>
                <p>
                  <strong>2.3.</strong> In case of incorrect account
                  information, the platform has the right to restrict or cancel
                  the account.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>3. Seller Obligations</h4>
                <p>
                  <strong>3.1.</strong> Sellers must provide accurate product
                  descriptions, photos, and prices.
                </p>
                <p>
                  <strong>3.2.</strong> Products must comply with applicable
                  laws and must not be prohibited or legally restricted.
                </p>
                <p>
                  <strong>3.3.</strong> Sellers are responsible for timely and
                  safe product shipping.
                </p>
                <p>
                  <strong>3.4.</strong> The platform has the right to set
                  commission or percentage from each sale, which will be
                  predetermined on the website or in agreements.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>4. User Obligations</h4>
                <p>
                  <strong>4.1.</strong> Users must provide accurate delivery
                  address and contact information.
                </p>
                <p>
                  <strong>4.2.</strong> When ordering products, users must pay
                  the full amount on time according to specified terms.
                </p>
                <p>
                  <strong>4.3.</strong> Users are prohibited from using the
                  platform for fraudulent or illegal purposes.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>5. Return and Exchange Terms</h4>
                <p>
                  <strong>5.1.</strong> Users have the right to refuse purchased
                  products and request returns according to Georgian legislation
                  (within 14 calendar days of product receipt), if the product
                  is unused and maintained in original condition.
                </p>
                <p>
                  <strong>5.2.</strong> Return costs, except when the product
                  was damaged or incorrect, are covered by the user.
                </p>
                <p>
                  <strong>5.3.</strong> Refunds will be processed through the
                  same method as payment, unless otherwise agreed between
                  parties.
                </p>
                <p>
                  <strong>5.4.</strong> Certain product categories (e.g.,
                  personal hygiene items, food products, individually made
                  products) are not subject to returns unless defective.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>6. Payments and Commissions</h4>
                <p>
                  <strong>6.1.</strong> The platform takes commission or
                  percentage from each successful sale, as specified in advance
                  in the terms.
                </p>
                <p>
                  <strong>6.2.</strong> Commission amounts and payment deadlines
                  are posted on the website and may change with advance notice.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>7. Limitation of Liability</h4>
                <p>
                  <strong>7.1.</strong> The platform is not responsible for
                  disputes between sellers and users, except in cases directly
                  provided by law.
                </p>
                <p>
                  <strong>7.2.</strong> The platform does not guarantee product
                  quality or compliance, except for guarantees provided by
                  sellers.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>8. Confidentiality</h4>
                <p>
                  <strong>8.1.</strong> Personal data of users and sellers will
                  be processed according to applicable legislation and used only
                  for service provision purposes.
                </p>
                <p>
                  <strong>8.2.</strong> Detailed information on personal data
                  processing is provided in the privacy policy.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>9. Termination of Use</h4>
                <p>
                  <strong>9.1.</strong> The platform has the right to terminate
                  or suspend account activity for any person who violates rules
                  and terms.
                </p>
                <p>
                  <strong>9.2.</strong> In case of account cancellation,
                  obligations that arose before term violations remain in
                  effect.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4>10. Contact Information</h4>
                <p>For all questions and disputes, you can contact us:</p>
                <p>📧 support@soulart.ge</p>
                <p>📍 Tbilisi, Georgia</p>
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
                background: "var(--secondary-color)",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {language === "ge" ? "ვეთანხმები პირობებს" : "I Agree to Terms"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
