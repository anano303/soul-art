"use client";

interface Texts {
  [key: string]: {
    home: string;
    homeContent: string;  // ახალი: "მთავარი" გვერდის აღწერა
    about: string;
    aboutContent: string;  // ახალი: "ჩვენს შესახებ" გვერდის აღწერა
    contact: string;
    contactContent: string;  // ახალი: "კონტაქტი" გვერდის აღწერა
  };
}

export const TEXTS: Texts = {
  ge: {
    home: "მთავარი",
    homeContent: "ეს არის \"მთავარი\" გვერდი.",  // ქართული აღწერა
    about: "ჩვენს შესახებ",
    aboutContent: "ეს არის \"ჩვენს შესახებ\" გვერდი.",  // ქართული აღწერა
    contact: "კონტაქტი",
    contactContent: "დაგვიკავშირდით აქ.",  // ქართული აღწერა
  },
  en: {
    home: "HOME",
    homeContent: "This is the 'Home' page.",  // ინგლისური აღწერა
    about: "About",
    aboutContent: "This is the 'About' page.",  // ინგლისური აღწერა
    contact: "Contact",
    contactContent: "Contact us here.",  // ინგლისური აღწერა
  },
};

