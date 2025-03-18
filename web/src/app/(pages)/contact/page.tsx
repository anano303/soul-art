"use client";

import { useContext } from "react";
import { LanguageContext } from "@/hooks/LanguageContext";
import { TEXTS } from "@/hooks/Languages";

const ContactPage = () => {
  const { language } = useContext(LanguageContext);

  return (
    <div>
      <h1>{TEXTS[language].contact}</h1>
      <p>{TEXTS[language].contactContent}</p>
    </div>
  );
};

export default ContactPage;
