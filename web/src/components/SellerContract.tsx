"use client";

import { useLanguage } from "@/hooks/LanguageContext";

interface SellerContractProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function SellerContract({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}: SellerContractProps) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const handleDownload = () => {
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
              ? "სელერის ხელშეკრულება - SoulArt.ge"
              : "Seller Contract - SoulArt.ge"
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
              ? "საჯარო ხელშეკრულება გამყიდველებისთვის"
              : "Public Agreement for Sellers"
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

      // ცოტა დავლოდოთ რომ კონტენტი ჩაიტვირთოს
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
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
              ? "საჯარო ხელშეკრულება გამყიდველებისთვის"
              : "Public Agreement for Sellers"}
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
              }}
            >
              📄 {language === "ge" ? "PDF გადმოწერა" : "Download PDF"}
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
                ? "SoulArt.ge პლატფორმის გამოყენების პირობები"
                : "SoulArt.ge Platform Terms of Use"}
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

          {/* Contract content sections with multilingual support */}
          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "1. ზოგადი დებულებები"
                : "1. General Provisions"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>1.1.</strong> წინამდებარე საჯარო ხელშეკრულება
                  (&quot;ხელშეკრულება&quot;) წარმოადგენს იურიდიულ შეთავაზებას
                  SoulArt პლატფორმის (&quot;პლატფორმა&quot;) და ნებისმიერი
                  რეგისტრირებული გამყიდველის (&quot;გამყიდველი&quot;) შორის.
                </p>
                <p>
                  <strong>1.2.</strong> ხელშეკრულება ძალაში შედის გამყიდველის
                  რეგისტრაციისა და პირობებზე ელექტრონული თანხმობის დადასტურების
                  მომენტიდან.
                </p>
                <p>
                  <strong>1.3.</strong> პლატფორმა მოქმედებს, როგორც შუამავალი
                  გამყიდველსა და მყიდველს შორის და უზრუნველყოფს მხოლოდ ტექნიკურ
                  და სერვისულ მხარდაჭერას.
                </p>
                <p>
                  <strong>1.4.</strong> ხელშეკრულება რეგულირდება საქართველოს
                  კანონმდებლობით.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>1.1.</strong> This public agreement
                  (&quot;Agreement&quot;) constitutes a legal offer between the
                  SoulArt platform (&quot;Platform&quot;) and any registered
                  seller (&quot;Seller&quot;).
                </p>
                <p>
                  <strong>1.2.</strong> The Agreement becomes effective from the
                  moment of seller registration and confirmation of electronic
                  consent to the terms.
                </p>
                <p>
                  <strong>1.3.</strong> The Platform acts as an intermediary
                  between sellers and buyers and provides only technical and
                  service support.
                </p>
                <p>
                  <strong>1.4.</strong> The Agreement is governed by the laws of
                  Georgia.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "2. საკომისიო და გადახდის პირობები"
                : "2. Commission and Payment Terms"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>2.1.</strong> პლატფორმის საკომისიო შეადგენს გაყიდული
                  პროდუქტის ღირებულების 10%, თუ სხვა რამ არ არის ინდივიდუალურად
                  შეთანხმებული წერილობით.
                </p>
                <p>
                  <strong>2.2.</strong> გამყიდველს თანხა ჩაერიცხება ყოველი
                  მომდევნო თვის 10 რიცხვამდე, თვეში ერთხელ, იმ შეკვეთების
                  მიხედვით, რომლებიც წარმატებით ჩაბარდა მყიდველს.
                </p>
                <p>
                  <strong>2.3.</strong> ვადაზე ადრე თანხის გატანის მოთხოვნის
                  შემთხვევაში, გამყიდველს შეუძლია პლატფორმის პროფილიდან
                  მოითხოვოს თანხის გადმორიცხვა.
                </p>
                <p>
                  <strong>2.4.</strong> SoulArt-ის მიტანის სერვისის გამოყენების
                  შემთხვევაში:
                </p>
                <ul>
                  <li>
                    საფასური შეადგენს პროდუქტის ღირებულების 5%-ს, მინიმუმ 10
                    ლარი
                  </li>
                  <li>მაქსიმალური საფასური – 50 ლარი</li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  <strong>2.1.</strong> The Platform commission is 10% of the
                  sold product value, unless otherwise individually agreed in
                  writing.
                </p>
                <p>
                  <strong>2.2.</strong> The seller will receive payment by the
                  10th of each following month, once a month, for orders
                  successfully delivered to buyers.
                </p>
                <p>
                  <strong>2.3.</strong> For early withdrawal requests, the
                  seller can request money transfer from the platform profile.
                </p>
                <p>
                  <strong>2.4.</strong> When using SoulArt delivery service:
                </p>
                <ul>
                  <li>Fee is 5% of product value, minimum 10 GEL</li>
                  <li>Maximum fee – 50 GEL</li>
                </ul>
              </>
            )}
          </div>

          {/* Continue with other sections... */}
          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "3. პროდუქციის მიწოდება და ხარისხი"
                : "3. Product Delivery and Quality"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>3.1.</strong> გამყიდველი ვალდებულია ჩააბაროს პროდუქცია
                  მყიდველს მითითებულ ვადებში და პირობებში.
                </p>
                <p>
                  <strong>3.2.</strong> თანხის ჩარიცხვა გამყიდველზე ხდება მხოლოდ
                  იმ შემთხვევაში, თუ შეკვეთა წარმატებით ჩაბარდა მყიდველს.
                </p>
                <p>
                  <strong>3.3.</strong> პროდუქცია უნდა შეესაბამებოდეს
                  პლატფორმაზე მითითებულ აღწერილობას, ფოტოებსა და ხარისხობრივ
                  სტანდარტებს.
                </p>
                <p>
                  <strong>3.4.</strong> გამყიდველი პასუხისმგებელია, რომ პროდუქტი
                  არ არღვევს საქართველოს კანონმდებლობას და მესამე პირების
                  ინტელექტუალურ საკუთრებას.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>3.1.</strong> The seller must deliver products to
                  buyers within the specified time and conditions.
                </p>
                <p>
                  <strong>3.2.</strong> Payment to the seller occurs only if the
                  order is successfully delivered to the buyer.
                </p>
                <p>
                  <strong>3.3.</strong> Products must comply with descriptions,
                  photos, and quality standards specified on the platform.
                </p>
                <p>
                  <strong>3.4.</strong> The seller is responsible that the
                  product does not violate Georgian legislation and third-party
                  intellectual property.
                </p>
              </>
            )}
          </div>

          {/* Continue with remaining sections... for brevity, I'll add a few more key sections */}
          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "4. დაბრუნება და ანაზღაურება"
                : "4. Returns and Refunds"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>4.1.</strong> ხელნაკეთი ნაწარმისა და ნახატების
                  სპეციფიკიდან გამომდინარე, დაბრუნება შესაძლებელია მხოლოდ შემდეგ
                  შემთხვევებში:
                </p>
                <ul>
                  <li>პროდუქცია მნიშვნელოვნად განსხვავდება აღწერილობისგან</li>
                  <li>პროდუქტი არის დაზიანებული ან ბრაკი</li>
                  <li>პროდუქტი არ ჩაბარდა დადგენილ ვადებში</li>
                </ul>
                <p>
                  <strong>4.2.</strong> დაბრუნების მოთხოვნა უნდა წარედგინოს
                  ჩაბარებიდან 7 კალენდარული დღის განმავლობაში.
                </p>
                <p>
                  <strong>4.3.</strong> დაბრუნების შემთხვევაში, გამყიდველი
                  ვალდებულია დააბრუნოს მყიდველისთვის პროდუქტის სრული ღირებულება.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>4.1.</strong> Due to the specificity of handmade items
                  and paintings, returns are possible only in the following
                  cases:
                </p>
                <ul>
                  <li>Product significantly differs from description</li>
                  <li>Product is damaged or defective</li>
                  <li>Product was not delivered within specified time</li>
                </ul>
                <p>
                  <strong>4.2.</strong> Return request must be submitted within
                  7 calendar days from delivery.
                </p>
                <p>
                  <strong>4.3.</strong> In case of return, the seller must
                  refund the full product value to the buyer.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge" ? "5. პასუხისმგებლობა" : "5. Responsibility"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>5.1.</strong> გამყიდველი სრულად არის პასუხისმგებელი:
                </p>
                <ul>
                  <li>პროდუქციის ხარისხსა და შესაბამისობაზე</li>
                  <li>პროდუქტის უსაფრთხოებაზე</li>
                  <li>
                    ყველა იურიდიულ საკითხზე, დაკავშირებულ მის პროდუქციასთან
                  </li>
                  <li>ავტორის უფლებებთან დაკავშირებულ საკითხებზე</li>
                  <li>მყიდველთან კომუნიკაციაზე და სერვისის გაწევაზე</li>
                </ul>
                <p>
                  <strong>5.2.</strong> პლატფორმა არ არის პასუხისმგებელი:
                </p>
                <ul>
                  <li>გამყიდველის მიერ მიწოდებული პროდუქციის ხარისხზე</li>
                  <li>გამყიდველსა და მყიდველს შორის წარმოშობილ დავებზე</li>
                  <li>
                    გამყიდველის ქმედებებზე, რომლებიც არღვევს კანონმდებლობას
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  <strong>5.1.</strong> The seller is fully responsible for:
                </p>
                <ul>
                  <li>Product quality and compliance</li>
                  <li>Product safety</li>
                  <li>All legal issues related to their products</li>
                  <li>Copyright and authorship issues</li>
                  <li>Communication with buyers and service provision</li>
                </ul>
                <p>
                  <strong>5.2.</strong> The platform is not responsible for:
                </p>
                <ul>
                  <li>Quality of products provided by sellers</li>
                  <li>Disputes arising between sellers and buyers</li>
                  <li>Seller actions that violate legislation</li>
                </ul>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "6. ხელშეკრულების შეწყვეტა"
                : "6. Contract Termination"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>6.1.</strong> პლატფორმას უფლება აქვს შეწყვიტოს
                  გამყიდველის ხელშეკრულება ნებისმიერ დროს შემდეგ შემთხვევებში:
                </p>
                <ul>
                  <li>ხელშეკრულების პირობების ხშირი დარღვევა</li>
                  <li>მყიდველების მხრიდან სისტემატური საჩივრები</li>
                  <li>ყალბი ან არაკანონიერი პროდუქციის განთავსება</li>
                  <li>ინტელექტუალური საკუთრების დარღვევა</li>
                </ul>
                <p>
                  <strong>6.2.</strong> შეწყვეტისას პლატფორმას უფლება აქვს
                  შეაჩეროს გამყიდველის პროფილი და შეინარჩუნოს მყოფი თანხები
                  მანამ, სანამ ყველა დავა არ მოგვარდება.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>6.1.</strong> The platform has the right to terminate
                  the seller&apos;s contract at any time in the following cases:
                </p>
                <ul>
                  <li>Frequent violation of contract terms</li>
                  <li>Systematic complaints from buyers</li>
                  <li>Placement of fake or illegal products</li>
                  <li>Intellectual property violations</li>
                </ul>
                <p>
                  <strong>6.2.</strong> Upon termination, the platform has the
                  right to suspend the seller&apos;s profile and retain
                  available funds until all disputes are resolved.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "7. დავების გადაწყვეტა"
                : "7. Dispute Resolution"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>7.1.</strong> ყველა დავა, რაც შეიძლება წარმოიშვას
                  ხელშეკრულების საფუძველზე, გადაწყდება მოლაპარაკების გზით.
                </p>
                <p>
                  <strong>7.2.</strong> შეთანხმების მიღწევის შეუძლებლობის
                  შემთხვევაში, დავა გადაიჭრება საქართველოს სასამართლოში,
                  საქართველოს კანონმდებლობის შესაბამისად.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>7.1.</strong> All disputes that may arise on the basis
                  of the contract shall be resolved through negotiations.
                </p>
                <p>
                  <strong>7.2.</strong> In case of inability to reach an
                  agreement, the dispute will be resolved in a Georgian court,
                  in accordance with Georgian legislation.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>{language === "ge" ? "8. ცვლილებები" : "8. Changes"}</h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>8.1.</strong> პლატფორმას უფლება აქვს შეცვალოს
                  ხელშეკრულების პირობები, რაზეც გამყიდველს ეცნობება ელექტრონული
                  ფოსტით ან პლატფორმაზე შეტყობინების განთავსებით.
                </p>
                <p>
                  <strong>8.2.</strong> ცვლილებების ძალაში შესვლის შემდეგ
                  პლატფორმის გამოყენების გაგრძელება ითვლება ცვლილებებზე
                  გამყიდველის თანხმობად.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>8.1.</strong> The platform has the right to change the
                  terms of the contract, which will be communicated to the
                  seller by email or by posting a notification on the platform.
                </p>
                <p>
                  <strong>8.2.</strong> Continued use of the platform after
                  changes come into effect is considered the seller&apos;s
                  consent to the changes.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "9. საბოლოო დებულებები"
                : "9. Final Provisions"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>9.1.</strong> ხელშეკრულება ძალაში შედის გამყიდველის
                  რეგისტრაციის მომენტიდან.
                </p>
                <p>
                  <strong>9.2.</strong> ხელშეკრულება შედგენილია ქართულ ენაზე და
                  რეგულირდება საქართველოს კანონმდებლობით.
                </p>
                <p>
                  <strong>9.3.</strong> ნებისმიერი საკითხი, რომელიც არ არის
                  გაწერილი ამ ხელშეკრულებაში, რეგულირდება საქართველოს მოქმედი
                  კანონმდებლობით.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>9.1.</strong> The contract comes into force from the
                  moment of seller registration.
                </p>
                <p>
                  <strong>9.2.</strong> The contract is concluded in Georgian
                  and is governed by Georgian legislation.
                </p>
                <p>
                  <strong>9.3.</strong> Any issue not covered in this contract
                  is governed by the current legislation of Georgia.
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>
              {language === "ge"
                ? "10. თანხმობის შედეგები"
                : "10. Consent Consequences"}
            </h4>
            {language === "ge" ? (
              <>
                <p>
                  <strong>10.1.</strong> პლატფორმაზე რეგისტრაციით და ამ
                  ხელშეკრულების პირობებზე თანხმობის დადასტურებით, გამყიდველი
                  ადასტურებს, რომ:
                </p>
                <ul>
                  <li>სრულად გაეცნო ხელშეკრულების ყველა პუნქტს</li>
                  <li>
                    იღებს ყველა ვალდებულებას, რომელიც დადგენილია ხელშეკრულებაში
                  </li>
                  <li>თანახმაა პლატფორმის პოლიტიკასა და წესებზე</li>
                  <li>
                    იცის, რომ პირობების დარღვევა შეიძლება გამოიწვიოს ანგარიშის
                    დაბლოკვა ან ხელშეკრულების შეწყვეტა პლატფორმის მხრიდან
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  <strong>10.1.</strong> By registering on the platform and
                  confirming consent to the terms of this contract, the seller
                  confirms that:
                </p>
                <ul>
                  <li>Has fully reviewed all points of the contract</li>
                  <li>Accepts all obligations established in the contract</li>
                  <li>Agrees to the platform&apos;s policies and rules</li>
                  <li>
                    Knows that violation of terms may result in account blocking
                    or contract termination by the platform
                  </li>
                </ul>
              </>
            )}
          </div>
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
              {language === "ge" ? "ვეთანხმები პირობებს" : "I Agree to Terms"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
