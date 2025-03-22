"use client";

import { useContext, useState } from "react";
import { LanguageContext } from "../../hooks/LanguageContext";
import { TEXTS } from "../../hooks/Languages";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import type { StaticImageData } from "next/image"; // StaticImageData ტიპის იმპორტი
import "./navbar.css";

import homeIcon from "../../assets/icons/home.png";

import shopping from "../../assets/icons/shopping.png";
import video from "../../assets/icons/video.png";
import forum from "../../assets/icons/forum.png";
import about from "../../assets/icons/about.png";

interface MenuItem {
  href: string;
  text: string;
  icon: StaticImageData;
}

const Navbar: React.FC = () => {
  const { language } = useContext(LanguageContext);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { href: "/", text: TEXTS[language].home, icon: homeIcon },
  
    { href: "/shop", text: "Shopping", icon: shopping },
    { href: "/video", text: "Video", icon: video },
    { href: "/forum", text: "Forum", icon: forum },
    { href: "/about", text: TEXTS[language].about, icon: about },
  ];

  const handleClick = (e: React.MouseEvent, index: number, href: string) => {
    e.preventDefault();
    
    if (activeItem === index) {
      // თუ იგივე აიტემზე დავაკლიკეთ მეორედ, გადავდივართ ლინკზე
      router.push(href);
      setActiveItem(null); // ვასუფთავებთ აქტიურ აიტემს
    } else {
      // პირველი კლიკი - ვააქტიურებთ აიტემს
      setActiveItem(index);
    }
  };

  return (
    <div className="NavCont">
      <ul className="UlCont">
        {menuItems.map((item, index) => (
          <li key={index}>
            <Link 
              href={item.href}
              className={activeItem === index ? 'active' : ''}
              onClick={(e) => handleClick(e, index, item.href)}
            >
              <Image 
                src={item.icon} 
                alt={item.text} 
                width={20} 
                height={20} 
                className="icon"
              />
              <span>{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Navbar;
