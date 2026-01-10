"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";
import "./careers.css";

export default function CareersPage() {
  const { language } = useLanguage();

  const content = {
    ka: {
      title: "კარიერა SoulArt-ში",
      subtitle: "შემოუერთდი ჩვენს გუნდს და გახდი ქართული ხელოვნების პოპულარიზაციის ნაწილი",
      
      position: {
        title: "🎯 გაყიდვების მენეჯერი",
        type: "დისტანციური / თავისუფალი გრაფიკი",
        description: "ვეძებთ მოტივირებულ ადამიანებს, რომლებსაც სურთ დამატებითი შემოსავლის მიღება ხელოვნების სფეროში მუშაობით.",
        
        whatWeOffer: "რას გთავაზობთ:",
        offers: [
          "💰 საკომისიო შეთანხმებით - თითოეული გაყიდვიდან მიიღებ შეთანხმებულ პროცენტს",
          "🏠 სრულად დისტანციური მუშაობა - იმუშავე სახლიდან, ნებისმიერი ადგილიდან",
          "⏰ თავისუფალი გრაფიკი - შენ თვითონ განსაზღვრავ სამუშაო საათებს",
          "📈 შეუზღუდავი შემოსავლის პოტენციალი - რაც მეტს გაყიდი, მით მეტს გამოიმუშავებ",
          "🎨 უნიკალური პროდუქტები - ქართველი ხელოვანების ნამუშევრები",
          "📊 პირადი დეშბორდი - თვალყური ადევნე შენს გაყიდვებსა და შემოსავალს",
          "💳 ავტომატური გადარიცხვები - თანხა პირდაპირ შენს ანგარიშზე",
        ],
        
        whatYouDo: "რას გააკეთებ:",
        tasks: [
          "გააზიარებ შენს პერსონალურ რეფერალურ ლინკს",
          "მოიზიდავ ახალ მომხმარებლებს სოციალური მედიის, ბლოგების ან პირადი კონტაქტების მეშვეობით",
          "როცა შენი ლინკით შემოსული მომხმარებელი შეიძენს პროდუქტს - მიიღებ საკომისიოს",
        ],
        
        requirements: "მოთხოვნები:",
        reqs: [
          "კომუნიკაბელურობა და პროაქტიულობა",
          "სოციალური მედიის ცოდნა - სასურველია ბევრი გამომწერი (followers) სოც. ქსელებში",
          "ხელოვნებისადმი ინტერესი",
          "სმარტფონი ან კომპიუტერი ინტერნეტით",
        ],
        
        howToApply: "როგორ განაცხადო:",
        applyText: "თუ დაინტერესდი, დაგვიკავშირდი და მოგვწერე მოკლედ შენს შესახებ. გიამბობთ დეტალებს და შეთანხმებას საკომისიოზე!",
      },
      
      contactButton: "დაგვიკავშირდი",
      backToHome: "მთავარ გვერდზე დაბრუნება",
    },
    en: {
      title: "Careers at SoulArt",
      subtitle: "Join our team and become part of promoting Georgian art",
      
      position: {
        title: "🎯 Sales Manager",
        type: "Remote / Flexible Schedule",
        description: "We are looking for motivated individuals who want to earn extra income working in the art field.",
        
        whatWeOffer: "What We Offer:",
        offers: [
          "💰 Commission by agreement - earn an agreed percentage from each sale",
          "🏠 Fully remote work - work from home, from anywhere",
          "⏰ Flexible schedule - you set your own working hours",
          "📈 Unlimited income potential - the more you sell, the more you earn",
          "🎨 Unique products - works by Georgian artists",
          "📊 Personal dashboard - track your sales and income",
          "💳 Automatic transfers - money directly to your account",
        ],
        
        whatYouDo: "What You'll Do:",
        tasks: [
          "Share your personal referral link",
          "Attract new customers through social media, blogs, or personal contacts",
          "When a customer coming through your link makes a purchase - you earn commission",
        ],
        
        requirements: "Requirements:",
        reqs: [
          "Good communication skills and proactivity",
          "Social media knowledge - preferably with many followers on social networks",
          "Interest in art",
          "Smartphone or computer with internet",
        ],
        
        howToApply: "How to Apply:",
        applyText: "If you're interested, contact us and tell us briefly about yourself. We'll share details and discuss commission rates!",
      },
      
      contactButton: "Contact Us",
      backToHome: "Back to Home",
    },
  };

  const t = content[language as keyof typeof content] || content.ka;

  return (
    <div className="careers-page">
      <div className="careers-container">
        <div className="careers-title-section">
          <h1>{t.title}</h1>
          <p className="careers-subtitle">{t.subtitle}</p>
        </div>

        <section className="position-card">
          <div className="position-header">
            <h2>{t.position.title}</h2>
            <span className="position-type">{t.position.type}</span>
          </div>
          
          <p className="position-description">{t.position.description}</p>

          <div className="position-section">
            <h3>{t.position.whatWeOffer}</h3>
            <ul className="offer-list">
              {t.position.offers.map((offer, index) => (
                <li key={index}>{offer}</li>
              ))}
            </ul>
          </div>

          <div className="position-section">
            <h3>{t.position.whatYouDo}</h3>
            <ul className="task-list">
              {t.position.tasks.map((task, index) => (
                <li key={index}>{task}</li>
              ))}
            </ul>
          </div>

          <div className="position-section">
            <h3>{t.position.requirements}</h3>
            <ul className="requirements-list">
              {t.position.reqs.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>

          <div className="apply-section">
            <h3>{t.position.howToApply}</h3>
            <p>{t.position.applyText}</p>
            
            <Link href="/contact" className="contact-button">
              {t.contactButton}
            </Link>
          </div>
        </section>

        <div className="careers-footer">
          <Link href="/" className="back-link">
            ← {t.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
