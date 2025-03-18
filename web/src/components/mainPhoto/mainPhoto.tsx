"use client";

import { useState } from "react";
import Image from "next/image";
import fishingPhoto from "../../assets/fishingPhoto.jpg";
import map from "../../assets/map.png";
import target from "../../assets/target.png";
import "./mainPhoto.css";

const MainPhoto = () => {
  const [cursorPosition, setCursorPosition] = useState({ x: "50%", y: "50%" });

  const handleMouseMove = (event: React.MouseEvent) => {
    const { left, top } = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setCursorPosition({
      x: `${event.clientX - left - 80}px`, // კურსორისგან px მარჯვნივ
      y: `${event.clientY - top - 5}px`, // კურსორისგან px ზემოთ
    });
  };

  const handleMouseLeave = () => {
    setCursorPosition({ x: "50%", y: "50%" }); // ცენტრში დაბრუნება
  };

  return (
    <div
      className="photo-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="photo-frame">
        <Image src={fishingPhoto} alt="Fishing" className="main-photo" />
        <Image
          src={map}
          alt="Map"
          className="map"
        />
        <Image
          src={target}
          alt="Target"
          className="target"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        />
      </div>
    </div>
  );
};

export default MainPhoto;
