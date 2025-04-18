import './benefits.css';

export default function SellerBenefits() {
  return (
    <section className="seller-benefits">
      <h2 className="SellerTitle">შექმენი შენი პირადი ონლაინ გალერეა Soulart-ზე</h2>

      <p className="subtitle">
        Soulart.ge — პირველი ქართული პლატფორმა ხელოვანებისთვის, სადაც შეგიძლიათ შექმნათ 
        უნიკალური ონლაინ გალერეა და გაყიდოთ თქვენი ნამუშევრები მარტივად და კომფორტულად. 
        გახსენით ახალი შესაძლებლობები თქვენი ნამუშევრებისთვის!
      </p>

      <div className="grid">
        <div className="benefits">
          <h3 className="section-title">🌟 უპირატესობები ხელოვანებისთვის</h3>
          <ul className="list">
            <li>სრულიად უფასო პირადი ონლაინ გალერეა ულიმიტო ნამუშევრებით</li>
            <li>მარტივი რეგისტრაცია და ნამუშევრების ატვირთვა</li>
            <li>პირველი თვე - 0% საკომისიო გაყიდვებზე</li>
            <li>შემდგომი პერიოდი - მხოლოდ 10% წარმატებული გაყიდვებიდან</li>
            <li>ანაზღაურების მომენტალური ჩარიცხვა მითითებულ ანგარიშზე, მას შემდეგ რაც მომხმარებელი დაადასტურებს რომ მიიღო შეკვეთა </li>
            <li>დეტალური სტატისტიკა და სრული კონტროლი თქვენს გაყიდვებზე</li>
            <li>თქვენი ნამუშევრების პოპულარიზაცია ფართო აუდიტორიაში</li>
          </ul>
        </div>

        <div className="shipping">
          <h3 className="section-title">🚚 მოქნილი მიწოდების პირობები</h3>
          <ul className="list">
            <li>მიწოდების ტიპს თავად ირჩევთ პროდუქტის ატვირთვისას</li>
            <li>პირადი მიწოდების შემთხვევაში - დამატებითი გადასახადი არ არის</li>
            <li>Soulart-ის კურიერის სერვისით სარგებლობისას დაემატება მხოლოდ 4% ლოჯისტიკური საკომისიო</li>
            <li>მიწოდების ვარიანტები ავტომატურად ჩანს თქვენს პანელში და მარტივად იმართება</li>
            <li>უსაფრთხო ტრანზაქციები და მყიდველებთან კომუნიკაცია პლატფორმის შიგნით</li>
          </ul>
        </div>
      </div>

      <div className="cta">
        <p className="cta-text">✨ დაიწყეთ  მოგზაურობა Soulart-ზე და მიეცით თქვენს ნამუშევრებს ის აუდიტორია, რომელსაც იმსახურებენ!</p>
        <a href="#seller-register-form" className="cta-button">დარეგისტრირდი ახლავე</a>
      </div>
    </section>
  );
}
