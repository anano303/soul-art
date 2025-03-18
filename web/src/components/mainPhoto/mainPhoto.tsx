"use client";

import Image from "next/image";
import fishingPhoto from "../../assets/Images/van gog.jpg";
// import target from "../../assets/target.png";
import "./mainPhoto.css";
import SearchPage from "@/app/(pages)/search/[keyword]/page";
import SearchBox from "../SearchBox/search-box";

const MainPhoto = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-text">
          <h2>შეარჩიე მხატვრების ნამუშევრები ან გაყიდე შენი 🖌️</h2>
          <p> პერსონალური და ხელნაკეთი ნამუშევრები ქართველი ხელოვანებისგან </p>
        </div>
        <div className="search-box">
          <SearchBox />
        </div>
      </div>
    </div>
  );
};

export default MainPhoto;
