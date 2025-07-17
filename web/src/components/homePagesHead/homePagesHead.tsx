"use client";

import React from "react";
import MainPhoto from "../mainPhoto/mainPhoto";
import "./homePagesHead.css";

const HomePagesHead = () => {
  return (
    <div className="HomePageshead">
      <div>
        <MainPhoto />
      </div>
      <div>{/* Reserved space for discount cards or other content */}</div>
    </div>
  );
};

export default HomePagesHead;
