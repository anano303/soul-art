"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useEffect } from "react";

interface SalesManagerContractProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function SalesManagerContract({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}: SalesManagerContractProps) {
  const { language } = useLanguage();

  useEffect(() => {
    return () => {
      if (isOpen) {
        document.body.style.overflow = "unset";
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      const printWindow = window.open("", "_blank");
      const contractContent = document.querySelector(".contract-content");

      if (printWindow && contractContent) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${
              language === "ge"
                ? "პარტნიორობის ხელშეკრულება - SoulArt.ge"
                : "Partnership Agreement - SoulArt.ge"
            }</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 40px;
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
                border-bottom: 2px solid #7b5642;
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
              .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
              }
              .signature-box {
                width: 45%;
                border-top: 1px solid #333;
                padding-top: 10px;
                text-align: center;
              }
              @media print {
                body { margin: 20px; }
              }
            </style>
          </head>
          <body>
            ${contractContent.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error("Print error:", error);
    }
  };

  const contentGe = {
    title: "პარტნიორობის ხელშეკრულება",
    subtitle: "გაყიდვების მენეჯერის (Sales Manager) თანამშრომლობის პირობები",
    effectiveDate: "ძალაშია რეგისტრაციის მომენტიდან",
    
    article1: {
      title: "მუხლი 1. მხარეები",
      content: [
        "ერთი მხრივ, შპს \"SoulArt\" (შემდგომში \"კომპანია\"), რეგისტრირებული საქართველოს კანონმდებლობის შესაბამისად, რომელიც ოპერირებს ონლაინ პლატფორმას soulart.ge;",
        "მეორე მხრივ, ფიზიკური პირი, რომელიც რეგისტრირდება პლატფორმაზე გაყიდვების მენეჯერის (Sales Manager) სტატუსით (შემდგომში \"პარტნიორი\").",
        "წინამდებარე ხელშეკრულების მიღება (რეგისტრაციის დასრულება) ნიშნავს მხარეთა შორის სამართლებრივი ურთიერთობის დამყარებას."
      ]
    },

    article2: {
      title: "მუხლი 2. თანამშრომლობის საგანი",
      content: [
        "პარტნიორი იღებს ვალდებულებას, ხელი შეუწყოს SoulArt-ის პლატფორმაზე გაყიდვების ზრდას საკუთარი რეფერალური ბმულის გაზიარებით.",
        "კომპანია იღებს ვალდებულებას, გადაუხადოს პარტნიორს საკომისიო თითოეული წარმატებული გაყიდვიდან, რომელიც განხორციელდა პარტნიორის რეფერალური ბმულით."
      ]
    },

    article3: {
      title: "მუხლი 3. საკომისიოს პირობები",
      content: [
        "3.1. სტანდარტული საკომისიო შეადგენს გაყიდვის თანხის 3%-ს (გროსი თანხიდან, ანუ ნებისმიერი ხარჯის გამოკლებამდე).",
        "3.2. საკომისიოს პროცენტი შესაძლებელია შეიცვალოს ინდივიდუალური შეთანხმებით, კომპანიის ადმინისტრაციის გადაწყვეტილებით.",
        "3.3. საკომისიო ირიცხება პარტნიორის პირად ანგარიშზე პლატფორმაზე მყისიერად, გაყიდვის დადასტურებისთანავე.",
        "3.4. საკომისიო გაიანგარიშება მხოლოდ წარმატებით დასრულებული და გადახდილი შეკვეთებიდან."
      ]
    },

    article4: {
      title: "მუხლი 4. თანხის გატანის პირობები",
      content: [
        "4.1. პარტნიორს უფლება აქვს მოითხოვოს დაგროვილი საკომისიოს გატანა ყოველი თვის 1-დან 10 რიცხვის ჩათვლით.",
        "4.2. მინიმალური გატანის თანხა შეადგენს 50 ლარს.",
        "4.3. თანხის გადარიცხვა ხორციელდება პარტნიორის მიერ მითითებულ საბანკო ანგარიშზე.",
        "4.4. გადარიცხვა ხორციელდება მოთხოვნიდან 3 სამუშაო დღის განმავლობაში.",
        "4.5. პარტნიორი ვალდებულია მიუთითოს ზუსტი საბანკო რეკვიზიტები და პირადი ნომერი. არასწორი მონაცემების შემთხვევაში კომპანია პასუხს არ აგებს დაყოვნებაზე."
      ]
    },

    article5: {
      title: "მუხლი 5. პარტნიორის ვალდებულებები",
      content: [
        "5.1. პარტნიორი ვალდებულია არ გაავრცელოს ყალბი ან შეცდომაში შემყვანი ინფორმაცია პლატფორმის ან პროდუქტების შესახებ.",
        "5.2. პარტნიორი ვალდებულია დაიცვას კომპანიის რეპუტაცია და საქმიანი ეთიკის ნორმები.",
        "5.3. პარტნიორი ვალდებულია არ გამოიყენოს სპამი, თაღლითური ან არაეთიკური მარკეტინგული მეთოდები.",
        "5.4. პარტნიორი დამოუკიდებლად აგებს პასუხს საკუთარი საგადასახადო ვალდებულებების შესრულებაზე."
      ]
    },

    article6: {
      title: "მუხლი 6. კომპანიის ვალდებულებები",
      content: [
        "6.1. კომპანია ვალდებულია უზრუნველყოს პარტნიორი უნიკალური რეფერალური ბმულით.",
        "6.2. კომპანია ვალდებულია უზრუნველყოს გაყიდვებისა და საკომისიოს თვალყურის დევნების სისტემა (დეშბორდი).",
        "6.3. კომპანია ვალდებულია დროულად გადარიცხოს დაგროვილი საკომისიო მოთხოვნის შემთხვევაში.",
        "6.4. კომპანია ვალდებულია წინასწარ აცნობოს პარტნიორს საკომისიოს პროცენტის ან გატანის პირობების ცვლილების შესახებ."
      ]
    },

    article7: {
      title: "მუხლი 7. ხელშეკრულების მოქმედების ვადა და შეწყვეტა",
      content: [
        "7.1. ხელშეკრულება ძალაში შედის რეგისტრაციის მომენტიდან და მოქმედებს განუსაზღვრელი ვადით.",
        "7.2. ნებისმიერ მხარეს უფლება აქვს შეწყვიტოს ხელშეკრულება წერილობითი შეტყობინებით 14 კალენდარული დღით ადრე.",
        "7.3. კომპანიას უფლება აქვს დაუყოვნებლივ შეწყვიტოს ხელშეკრულება პარტნიორის მიერ პირობების დარღვევის შემთხვევაში.",
        "7.4. ხელშეკრულების შეწყვეტის შემთხვევაში, პარტნიორს უფლება აქვს მოითხოვოს შეწყვეტის მომენტისთვის დაგროვილი საკომისიო."
      ]
    },

    article8: {
      title: "მუხლი 8. კონფიდენციალურობა",
      content: [
        "8.1. მხარეები იღებენ ვალდებულებას არ გაამჟღავნონ კონფიდენციალური ინფორმაცია მესამე პირებისთვის.",
        "8.2. პარტნიორის პირადი მონაცემები მუშავდება კომპანიის კონფიდენციალურობის პოლიტიკის შესაბამისად."
      ]
    },

    article9: {
      title: "მუხლი 9. დავების გადაწყვეტა",
      content: [
        "9.1. ნებისმიერი დავა გადაწყდება მოლაპარაკების გზით.",
        "9.2. შეთანხმების მიუღწევლობის შემთხვევაში, დავა განიხილება საქართველოს კანონმდებლობის შესაბამისად, თბილისის საქალაქო სასამართლოში."
      ]
    },

    article10: {
      title: "მუხლი 10. დასკვნითი დებულებები",
      content: [
        "10.1. წინამდებარე ხელშეკრულება წარმოადგენს მხარეთა შორის სრულ შეთანხმებას.",
        "10.2. ხელშეკრულებაში ცვლილების შეტანა შესაძლებელია კომპანიის მიერ პარტნიორის წინასწარი შეტყობინებით.",
        "10.3. რეგისტრაციის დასრულებით პარტნიორი ადასტურებს, რომ გაეცნო და ეთანხმება წინამდებარე პირობებს."
      ]
    },

    acceptButton: "ვეთანხმები პირობებს",
    downloadButton: "ჩამოტვირთვა / ბეჭდვა",
    closeButton: "დახურვა"
  };

  const contentEn = {
    title: "Partnership Agreement",
    subtitle: "Sales Manager Collaboration Terms",
    effectiveDate: "Effective from the moment of registration",
    
    article1: {
      title: "Article 1. Parties",
      content: [
        "On one hand, \"SoulArt\" LLC (hereinafter \"Company\"), registered in accordance with Georgian legislation, operating the online platform soulart.ge;",
        "On the other hand, an individual who registers on the platform with Sales Manager status (hereinafter \"Partner\").",
        "Acceptance of this agreement (completion of registration) establishes a legal relationship between the parties."
      ]
    },

    article2: {
      title: "Article 2. Subject of Cooperation",
      content: [
        "The Partner undertakes to promote sales growth on the SoulArt platform by sharing their personal referral link.",
        "The Company undertakes to pay the Partner a commission for each successful sale made through the Partner's referral link."
      ]
    },

    article3: {
      title: "Article 3. Commission Terms",
      content: [
        "3.1. The standard commission is 3% of the sale amount (gross amount, before any deductions).",
        "3.2. The commission percentage may be changed by individual agreement at the discretion of the Company's administration.",
        "3.3. Commission is credited to the Partner's personal account on the platform instantly upon sale confirmation.",
        "3.4. Commission is calculated only from successfully completed and paid orders."
      ]
    },

    article4: {
      title: "Article 4. Withdrawal Terms",
      content: [
        "4.1. The Partner has the right to request withdrawal of accumulated commission from the 1st to the 10th of each month.",
        "4.2. The minimum withdrawal amount is 50 GEL.",
        "4.3. Funds are transferred to the bank account specified by the Partner.",
        "4.4. Transfer is processed within 3 business days of the request.",
        "4.5. The Partner is obligated to provide accurate banking details and personal ID number. The Company is not responsible for delays caused by incorrect data."
      ]
    },

    article5: {
      title: "Article 5. Partner's Obligations",
      content: [
        "5.1. The Partner shall not spread false or misleading information about the platform or products.",
        "5.2. The Partner shall protect the Company's reputation and comply with business ethics standards.",
        "5.3. The Partner shall not use spam, fraudulent, or unethical marketing methods.",
        "5.4. The Partner is independently responsible for fulfilling their own tax obligations."
      ]
    },

    article6: {
      title: "Article 6. Company's Obligations",
      content: [
        "6.1. The Company shall provide the Partner with a unique referral link.",
        "6.2. The Company shall provide a sales and commission tracking system (dashboard).",
        "6.3. The Company shall transfer accumulated commission in a timely manner upon request.",
        "6.4. The Company shall notify the Partner in advance of any changes to commission rates or withdrawal terms."
      ]
    },

    article7: {
      title: "Article 7. Term and Termination",
      content: [
        "7.1. This agreement comes into force from the moment of registration and remains valid indefinitely.",
        "7.2. Either party may terminate the agreement with 14 calendar days' written notice.",
        "7.3. The Company may terminate the agreement immediately in case of Partner's breach of terms.",
        "7.4. Upon termination, the Partner has the right to claim commission accumulated up to the termination date."
      ]
    },

    article8: {
      title: "Article 8. Confidentiality",
      content: [
        "8.1. The parties undertake not to disclose confidential information to third parties.",
        "8.2. Partner's personal data is processed in accordance with the Company's Privacy Policy."
      ]
    },

    article9: {
      title: "Article 9. Dispute Resolution",
      content: [
        "9.1. Any dispute shall be resolved through negotiation.",
        "9.2. If agreement cannot be reached, disputes shall be resolved in accordance with Georgian legislation at Tbilisi City Court."
      ]
    },

    article10: {
      title: "Article 10. Final Provisions",
      content: [
        "10.1. This agreement constitutes the complete agreement between the parties.",
        "10.2. Amendments to the agreement may be made by the Company with prior notice to the Partner.",
        "10.3. By completing registration, the Partner confirms that they have read and agree to these terms."
      ]
    },

    acceptButton: "I Accept the Terms",
    downloadButton: "Download / Print",
    closeButton: "Close"
  };

  const content = language === "ge" ? contentGe : contentEn;

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
          <h2 style={{ margin: 0, fontSize: "20px" }}>{content.title}</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={handleDownload}
              title={content.downloadButton}
              style={{
                background: "#7b5642",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              📥 {content.downloadButton}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                padding: "0 10px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          className="privacy-content contract-content"
          style={{
            padding: "20px",
            overflowY: "auto",
            maxHeight: "calc(90vh - 160px)",
            lineHeight: "1.7",
          }}
        >
          <h3 style={{ textAlign: "center", marginBottom: "5px" }}>
            {content.subtitle}
          </h3>
          <p style={{ textAlign: "center", color: "#666", marginBottom: "20px" }}>
            {content.effectiveDate}
          </p>

          {/* Article 1 */}
          <h4>{content.article1.title}</h4>
          {content.article1.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 2 */}
          <h4>{content.article2.title}</h4>
          {content.article2.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 3 */}
          <h4>{content.article3.title}</h4>
          {content.article3.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 4 */}
          <h4>{content.article4.title}</h4>
          {content.article4.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 5 */}
          <h4>{content.article5.title}</h4>
          {content.article5.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 6 */}
          <h4>{content.article6.title}</h4>
          {content.article6.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 7 */}
          <h4>{content.article7.title}</h4>
          {content.article7.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 8 */}
          <h4>{content.article8.title}</h4>
          {content.article8.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 9 */}
          <h4>{content.article9.title}</h4>
          {content.article9.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}

          {/* Article 10 */}
          <h4>{content.article10.title}</h4>
          {content.article10.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>

        {showAcceptButton && onAccept ? (
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
              {content.acceptButton}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
