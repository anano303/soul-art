"use client";

import React from "react";
import "./MessengerChat.css";

const MessengerChat = () => {
  const handleChatClick = () => {
    window.open("https://m.me/61574985443236", "_blank");
  };

  return (
    <div
      className="chatIcon"
      onClick={handleChatClick}
      title="დაგვიკავშირდით მესენჯერში"
      style={{
        position: "fixed",
        bottom: "30px",
        right: "30px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundColor: "#012645",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
      }}
    >
      {/* Facebook Messenger icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 28 28"
        fill="#ffffff"
      >
        <path d="M14,2.25C7.54,2.25,2.25,7.16,2.25,13.17c0,3.36,1.67,6.35,4.28,8.28V25.5l3.92-2.15c1.13,0.31,2.33,0.48,3.55,0.48c6.46,0,11.75-4.91,11.75-10.92S20.46,2.25,14,2.25z M15.34,17.5L12.5,14.5l-5.5,3l6-6.5l3,2.84l5.34-2.84L15.34,17.5z" />
      </svg>
    </div>
  );
};

export default MessengerChat;
