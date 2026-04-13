#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const faqs = [
  {
    questionKa: 'როგორ შევუკვეთო ნამუშევარი?',
    questionEn: 'How do I order an artwork?',
    answerKa:
      "აირჩიეთ სასურველი ნამუშევარი, დააჭირეთ 'კალათაში დამატება' ღილაკს, შემდეგ გადადით კალათაში და გააფორმეთ შეკვეთა. შეგიძლიათ გადაიხადოთ ნებისმიერი ტიპის ბარათით ან საბანკო გადარიცხვით.",
    answerEn:
      "Choose the artwork you like, click 'Add to Cart', then go to your cart and proceed to checkout. You can pay by any type of card or bank transfer.",
    order: 0,
    isActive: true,
  },
  {
    questionKa: 'რამდენ დღეში მოხდება მიტანა?',
    questionEn: 'How long does delivery take?',
    answerKa:
      'თბილისში მიტანა ხდება 1-3 სამუშაო დღეში. რეგიონებში — 3-5 სამუშაო დღეში. საერთაშორისო მიწოდება 7-21 სამუშაო დღე.',
    answerEn:
      'Delivery within Tbilisi takes 1-3 business days. To other regions — 3-5 business days. International shipping takes 7-21 business days.',
    order: 1,
    isActive: true,
  },
  {
    questionKa: 'შეიძლება ნამუშევრის დაბრუნება?',
    questionEn: 'Can I return an artwork?',
    answerKa:
      'დიახ, თუ ნამუშევარი დაზიანებულია ან არ შეესაბამება აღწერას, შეგიძლიათ დააბრუნოთ ადგილზე კურიერთან ',
    answerEn:
      "Yes, if the artwork is damaged or doesn't match the description, you can return it to the courier on site. ",
    order: 2,
    isActive: true,
  },
  {
    questionKa: 'როგორ გავხდე გამყიდველი SoulArt-ზე?',
    questionEn: 'How do I become a seller on SoulArt?',
    answerKa:
      'დარეგისტრირდით საიტზე, შემდეგ დააჭირეთ "გახდი გამყიდველი" ღილაკს. შეავსეთ პროფილი, ატვირთეთ ნამუშევრები და დაელოდეთ ადმინისტრაციის დადასტურებას. რეგისტრაცია უფასოა.',
    answerEn:
      "Register on the website, then click 'Become a Seller'. Fill in your profile, upload your artworks, and wait for admin approval. Registration is free.",
    order: 3,
    isActive: true,
  },
  {
    questionKa: 'რა საკომისიოს იღებს SoulArt?',
    questionEn: 'What commission does SoulArt charge?',
    answerKa:
      'SoulArt იღებს 15%-იან საკომისიოს თითოეული გაყიდვიდან. ეს მოიცავს პლატფორმის მომსახურებას, მარკეტინგს და ტექნიკურ მხარდაჭერას.',
    answerEn:
      'SoulArt charges a 15% commission on each sale. This covers platform services, marketing, and technical support.',
    order: 4,
    isActive: true,
  },
  {
    questionKa: 'როგორ ხდება გადახდა?',
    questionEn: 'How does payment work?',
    answerKa:
      'გადახდა შესაძლებელია საბანკო ბარათით (Visa/Mastercard) ან საბანკო გადარიცხვით. გადახდა უსაფრთხოა და დაცულია SSL სერტიფიკატით.',
    answerEn:
      'Payment can be made by bank card (Visa/Mastercard) or bank transfer. All payments are secure and protected with SSL encryption.',
    order: 5,
    isActive: true,
  },
  {
    questionKa: 'შეიძლება ნამუშევრის შეკვეთით დამზადება?',
    questionEn: 'Can I commission a custom artwork?',
    answerKa:
      'დიახ! დაუკავშირდით პირდაპირ ხელოვანს პროფილის გვერდიდან ან გამოიყენეთ "მოითხოვე ზარი" ღილაკი ნამუშევრის გვერდზე და ჩვენ დაგეხმარებით.',
    answerEn:
      "Yes! Contact the artist directly from their profile page, or use the 'Request a Call' button on any artwork page and we'll help you.",
    order: 6,
    isActive: true,
  },
  {
    questionKa: 'უფასოა თუ არა მიტანა?',
    questionEn: 'Is delivery free?',
    answerKa:
      'თბილისში 100 ლარზე მეტი შეკვეთისას მიტანა უფასოა. 100 ლარამდე შეკვეთებზე მიტანის საფასური 10 ლარია. რეგიონებში და საერთაშორისო მიტანის ფასი დამოკიდებულია ლოკაციაზე.',
    answerEn:
      'Delivery within Tbilisi is free for orders over 100 GEL. For orders under 100 GEL, delivery costs 10 GEL. Regional and international shipping costs depend on the location.',
    order: 7,
    isActive: true,
  },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const faqsCollection = db.collection('faqs');

    const existingCount = await faqsCollection.countDocuments();
    console.log(`Existing FAQs: ${existingCount}`);

    if (existingCount > 0) {
      const deleteRes = await faqsCollection.deleteMany({});
      console.log(`Cleared ${deleteRes.deletedCount} old FAQs`);
    }

    const now = new Date();
    const docs = faqs.map((faq) => ({
      ...faq,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await faqsCollection.insertMany(docs);
    console.log(`✅ Successfully seeded ${result.insertedCount} FAQs!`);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
