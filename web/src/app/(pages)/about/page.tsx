import Link from "next/link";
import "./about.css";

export default function AboutPage() {
  return (
    <div className="about-container">
      <h1 className="about-title">ჩვენს შესახებ</h1>
      
      <div className="about-section">
        <p className="about-description">
          SoulArt არის პლატფორმა, რომელიც აერთიანებს მხატვრებს და ხელოვნების მოყვარულებს. 
          ჩვენი მიზანია შევქმნათ სივრცე, სადაც შეძლებთ გაყიდოთ და შეიძინოთ უნიკალური 
          ხელოვნების ნიმუშები, შექმნათ პირადი გალერეა და გახდეთ კოლექციონერი ან მხატვარი.
        </p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">მისია</h2>
        <p>
          ჩვენი მისიაა მხატვრებისთვის შევქმნათ პლატფორმა, სადაც ისინი შეძლებენ 
          თავიანთი ნამუშევრების გაზიარებას და გაყიდვას, ხოლო ხელოვნების მოყვარულებს 
          მივაწვდოთ უნიკალური ნამუშევრები.
        </p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">მიზანი</h2>
        <p>
          ჩვენი მიზანია გავაერთიანოთ ხელოვნების მოყვარულები და მხატვრები ერთიან 
          სივრცეში, სადაც ხელოვნება ყველასთვის ხელმისაწვდომი იქნება.
        </p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">ხედვა</h2>
        <p>
          SoulArt არის პირველი მსგავსი პლატფორმა საქართველოში, რომელიც აერთიანებს 
          ხელოვნების სამყაროს. ჩვენი ხედვაა გავხდეთ ხელოვნების მოყვარულთა და 
          მხატვართა მთავარი ადგილი.
        </p>
      </div>

      <div className="about-section about-highlight">
        <h2 className="about-subtitle">რატომ SoulArt?</h2>
        <p>
          საქართველოში მსგავსი პლატფორმა არ არსებობს. ჩვენ ვქმნით უნიკალურ 
          შესაძლებლობას, სადაც ხელოვნება და ტექნოლოგია ერთმანეთს ხვდება.
        </p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">გახდით გამყიდველი</h2>
        <p>
          გსურთ გაყიდოთ თქვენი ნამუშევრები? გახდით ჩვენი პლატფორმის ნაწილი და 
          მიაწვდეთ თქვენი ხელოვნება ფართო აუდიტორიას.
        </p>
        <Link 
          href="/sellers-register" 
          className="about-button about-seller-button"
        >
          დარეგისტრირდით როგორც გამყიდველი
        </Link>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">შეიძინეთ უნიკალური ნამუშევრები</h2>
        <p>
          ეძებთ უნიკალურ ხელოვნებას? დაათვალიერეთ ჩვენი პლატფორმა და იპოვეთ 
          ნამუშევრები, რომლებიც თქვენს გემოვნებას შეესაბამება.
        </p>
        <Link 
          href="/shop" 
          className="about-button about-shop-button"
        >
          დაათვალიერეთ ნამუშევრები
        </Link>
      </div>
    </div>
  );
}