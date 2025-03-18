"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LanguageContextProps {
  language: string;
  setLanguage: (newLanguage: string) => void;
}

const defaultContextValue: LanguageContextProps = {
  language: "ge",
  setLanguage: () => {},
};

export const LanguageContext = createContext<LanguageContextProps>(defaultContextValue);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<string>("ge");

  useEffect(() => {
    const fontFamily =
      language === "en"
        ? "'supreme', sans-serif"
        : "'firaGo', sans-serif;";
    document.body.style.fontFamily = fontFamily;
  }, [language]);

  const contextValue: LanguageContextProps = {
    language,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};
