"use client";

import { useState } from "react";
import { useLanguage } from "../../hooks/LanguageContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { StaticImageData } from "next/image";
import "./navbar.css";

import homeIcon from "../../assets/icons/home.png";
import shopping from "../../assets/icons/shopping.png";
import video from "../../assets/icons/video.png";
import forum from "../../assets/icons/forum.png";
import about from "../../assets/icons/about.png";

interface MenuItem {
  href: string;
  textKey: string;
  icon: StaticImageData;
}

const Navbar: React.FC = () => {
  const { t } = useLanguage();
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { href: "/", textKey: "navigation.home", icon: homeIcon },
    { href: "/shop", textKey: "navigation.shop", icon: shopping },
    { href: "/video", textKey: "navigation.forum", icon: video },
    { href: "/forum", textKey: "navigation.forum", icon: forum },
    { href: "/about", textKey: "navigation.about", icon: about },
  ];

  const handleClick = (e: React.MouseEvent, index: number, href: string) => {
    e.preventDefault();

    if (activeItem === index) {
      router.push(href);
      setActiveItem(null);
    } else {
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
              className={activeItem === index ? "active" : ""}
              onClick={(e) => handleClick(e, index, item.href)}
            >
              <Image
                src={item.icon}
                alt={t(item.textKey) as string}
                width={20}
                height={20}
                className="icon"
              />
              <span>{t(item.textKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Navbar;
