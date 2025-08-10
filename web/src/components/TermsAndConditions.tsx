"use client";

import { useLanguage } from "@/hooks/LanguageContext";

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
  const {  language } = useLanguage();

  if (!isOpen) return null;

  const handleDownload = () => {
    const element = document.createElement("a");
    const termsContent =
      language === "ge"
        ? `საიტის გამოყენების წესები და პირობები

ამ საიტის („სოულარტი") გამოყენებით, თქვენ ეთანხმებით ქვემოთ ჩამოთვლილ პირობებს. ეს პირობები ვრცელდება როგორც გამყიდველებზე, ასევე მომხმარებლებზე. გთხოვთ, ყურადღებით გაეცნოთ.

1. ზოგადი პირობები
1.1. საიტის მფლობელი: სოულარტი (შემდგომში „პლატფორმა") უზრუნველყოფს ონლაინ სივრცეს, სადაც გამყიდველებს შეუძლიათ განათავსონ და გაყიდონ პროდუქცია, ხოლო მომხმარებლებს – შეიძინონ.
1.2. საიტის გამოყენებით, ყველა მხარე ადასტურებს, რომ არის მოქმედი სამართლებრივი უნარის მქონე პირი და მიიღებს პასუხისმგებლობას საკუთარ მოქმედებებზე.
1.3. პლატფორმა უფლებას იტოვებს ნებისმიერ დროს განაახლოს ან შეცვალოს პირობები წინასწარი გაფრთხილების გარეშე.

2. რეგისტრაცია და ანგარიშები
2.1. გამყიდველმა უნდა უზრუნველყოს ზუსტი და სრულყოფილი ინფორმაცია რეგისტრაციისას.
2.2. აკრძალულია ერთზე მეტი ანგარიშის შექმნა ერთი და იმავე პირის მიერ გამყიდველის სტატუსით, თუ პლატფორმა წინასწარ არ დაამტკიცებს.
2.3. ანგარიშის მონაცემების არასწორად მითითების შემთხვევაში, პლატფორმას აქვს უფლება შეზღუდოს ან გააუქმოს ანგარიში.

3. გამყიდველების ვალდებულებები
3.1. გამყიდველი ვალდებულია უზრუნველყოს პროდუქციის აღწერა, ფოტოები და ფასები ზუსტად.
3.2. პროდუქცია უნდა აკმაყოფილებდეს მოქმედ კანონმდებლობას და არ უნდა იყოს აკრძალული ან სამართლებრივად შეზღუდული.
3.3. გამყიდველი პასუხისმგებელია პროდუქციის დროულ და უსაფრთხო გაგზავნაზე.
3.4. პლატფორმას უფლება აქვს დააწესოს საკომისიო ან პროცენტი ყოველი გაყიდვიდან, რაც წინასწარ იქნება განსაზღვრული საიტზე ან შეთანხმებაში.

4. მომხმარებელთა ვალდებულებები
4.1. მომხმარებელმა უნდა უზრუნველყოს ზუსტი მიწოდების მისამართი და საკონტაქტო ინფორმაცია.
4.2. პროდუქციის შეკვეთისას მომხმარებელი ვალდებულია დროულად გადაიხადოს სრული თანხა მითითებული პირობების შესაბამისად.
4.3. მომხმარებელს ეკრძალება პლატფორმის გამოყენება თაღლითური ან არამართლზომიერი მიზნებით.

5. დაბრუნების და გაცვლის პირობები
5.1. მომხმარებელს აქვს უფლება უარი თქვას შეძენილ პროდუქტზე და მოითხოვოს დაბრუნება საქართველოს კანონმდებლობის შესაბამისად (14 კალენდარული დღის განმავლობაში პროდუქციის მიღებიდან), თუ პროდუქტი არ არის გამოყენებული და ინახება პირვანდელ მდგომარეობაში.
5.2. დაბრუნების ხარჯები, გარდა შემთხვევებისა, როცა პროდუქტი იყო დაზიანებული ან არასწორი, ფარავს მომხმარებელი.
5.3. თანხის დაბრუნება განხორციელდება იმავე გზით, რომლითაც მოხდა გადახდა, თუ სხვა რამ არ იქნება შეთანხმებული მხარეებს შორის.
5.4. ზოგიერთი კატეგორიის პროდუქცია (მაგ.: პირადი ჰიგიენის ნივთები, საკვები პროდუქტები, ინდივიდუალურად დამზადებული პროდუქცია) დაბრუნებას არ ექვემდებარება, თუ არ არის დეფექტური.

6. გადახდები და საკომისიო
6.1. პლატფორმა იღებს საკომისიოს ან პროცენტს ყოველი წარმატებული გაყიდვიდან, რაც წინასწარ იქნება მითითებული პირობებში.
6.2. საკომისიოს ოდენობა და გადახდის ვადები განთავსდება საიტზე და შეიძლება შეიცვალოს წინასწარი შეტყობინებით.

7. პასუხისმგებლობის შეზღუდვა
7.1. პლატფორმა არ არის პასუხისმგებელი გამყიდველსა და მომხმარებელს შორის წარმოშობილ დავებზე, გარდა იმ შემთხვევებისა, როცა ეს პირდაპირ არის გათვალისწინებული კანონით.
7.2. პლატფორმა არ უზრუნველყოფს პროდუქციის ხარისხის ან შესაბამისობის გარანტიას, გარდა გამყიდველის მიერ გაცემული გარანტიისა.

8. კონფიდენციალურობა
8.1. მომხმარებელთა და გამყიდველთა პერსონალური მონაცემები დამუშავდება მოქმედი კანონმდებლობის შესაბამისად და გამოყენებული იქნება მხოლოდ მომსახურების მიწოდების მიზნით.
8.2. დეტალური ინფორმაცია პერსონალური მონაცემების დამუშავებაზე მოცემულია კონფიდენციალურობის პოლიტიკაში.

9. გამოყენების შეწყვეტა
9.1. პლატფორმას უფლება აქვს შეწყვიტოს ან შეაჩეროს ანგარიშის მოქმედება ნებისმიერი პირის მიმართ, რომელიც არღვევს წესებსა და პირობებს.
9.2. ანგარიშის გაუქმების შემთხვევაში, ვალდებულებები, რომლებიც წარმოიშვა პირობების დარღვევამდე, ძალაში რჩება.

10. საკონტაქტო ინფორმაცია
ყველა შეკითხვასა და დავასთან დაკავშირებით, შეგიძლიათ დაგვიკავშირდეთ:
📧 support@soulart.ge
📍 თბილისი, საქართველო`
        : `Website Terms and Conditions

By using this website ("SoulArt"), you agree to the terms and conditions listed below. These terms apply to both sellers and users. Please read carefully.

1. General Terms
1.1. Website Owner: SoulArt (hereinafter "Platform") provides an online space where sellers can list and sell products, and users can purchase them.
1.2. By using the website, all parties confirm that they are legally competent individuals and take responsibility for their actions.
1.3. The platform reserves the right to update or change terms at any time without prior notice.

2. Registration and Accounts
2.1. Sellers must provide accurate and complete information during registration.
2.2. Creating multiple accounts by the same person with seller status is prohibited unless pre-approved by the platform.
2.3. In case of incorrect account information, the platform has the right to restrict or cancel the account.

3. Seller Obligations
3.1. Sellers must provide accurate product descriptions, photos, and prices.
3.2. Products must comply with applicable laws and must not be prohibited or legally restricted.
3.3. Sellers are responsible for timely and safe product shipping.
3.4. The platform has the right to set commission or percentage from each sale, which will be predetermined on the website or in agreements.

4. User Obligations
4.1. Users must provide accurate delivery address and contact information.
4.2. When ordering products, users must pay the full amount on time according to specified terms.
4.3. Users are prohibited from using the platform for fraudulent or illegal purposes.

5. Return and Exchange Terms
5.1. Users have the right to refuse purchased products and request returns according to Georgian legislation (within 14 calendar days of product receipt), if the product is unused and maintained in original condition.
5.2. Return costs, except when the product was damaged or incorrect, are covered by the user.
5.3. Refunds will be processed through the same method as payment, unless otherwise agreed between parties.
5.4. Certain product categories (e.g., personal hygiene items, food products, individually made products) are not subject to returns unless defective.

6. Payments and Commissions
6.1. The platform takes commission or percentage from each successful sale, as specified in advance in the terms.
6.2. Commission amounts and payment deadlines are posted on the website and may change with advance notice.

7. Limitation of Liability
7.1. The platform is not responsible for disputes between sellers and users, except in cases directly provided by law.
7.2. The platform does not guarantee product quality or compliance, except for guarantees provided by sellers.

8. Confidentiality
8.1. Personal data of users and sellers will be processed according to applicable legislation and used only for service provision purposes.
8.2. Detailed information on personal data processing is provided in the privacy policy.

9. Termination of Use
9.1. The platform has the right to terminate or suspend account activity for any person who violates rules and terms.
9.2. In case of account cancellation, obligations that arose before term violations remain in effect.

10. Contact Information
For all questions and disputes, you can contact us:
📧 support@soulart.ge
📍 Tbilisi, Georgia`;

    const file = new Blob([termsContent], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download =
      language === "ge"
        ? "წესები_და_პირობები_SoulArt.txt"
        : "Terms_and_Conditions_SoulArt.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
              ? "საიტის გამოყენების წესები და პირობები"
              : "Website Terms and Conditions"}
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
                background: "#7b5642",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {language === "ge"
                ? "ვეთანხმები პირობებს"
                : "I Agree to Terms"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
