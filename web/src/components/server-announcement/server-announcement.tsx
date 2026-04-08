"use client";

import React, { useState, useEffect } from "react";
import "./server-announcement.css";

const STORAGE_KEY = "soulart_server_announcement_seen_v1";

export const ServerAnnouncement: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="announcement-overlay">
      <div className="announcement-modal">
        <div className="announcement-icon">⚠️</div>
        <h2 className="announcement-title">მნიშვნელოვანი შეტყობინება</h2>

        <div className="announcement-body">
          <p>
            <strong>ძვირფასო ხელოვანებო და მომხმარებლებო,</strong>
          </p>
          <p>
            გაცნობებთ, რომ ჩვენი სერვერები, რომლებიც განთავსებული იყო AWS-ის
            ბაჰრეინის რეგიონში, დაზარალდა რეგიონში მიმდინარე სამხედრო მოვლენების
            შედეგად. ამის გამო, თქვენი მონაცემები დროებით სრულად ან ნაწილობრივ მიუწვდომელია.
          </p>

          <div className="announcement-action-box">
            <p className="announcement-action-title">
              📌 რა უნდა გააკეთოთ ახლა:
            </p>
            <ul>
              <li>გაიარეთ ხელახალი რეგისტრაცია საიტზე თუ რეგისტრაციას გაუქმებულს გიჩვენებთ</li>
              <li>განათავსეთ თქვენი ნამუშევრები ხელახლა, ან მოგვწერეთ facebook გვერდზე თქვენი მეილი და ჩვენ აღვადგენთ თქვენს ნამუშევრებს</li>
            </ul>
          </div>

          <p>
            ჩვენი გუნდი პარალელურ რეჟიმში მუშაობს ძველი მონაცემების სრულად
            აღდგენაზე. აღდგენის ზუსტი ვადა ამ ეტაპზე უცნობია, თუმცა ყველაფერს
            ვაკეთებთ, რომ ეს რაც შეიძლება სწრაფად მოხდეს.
          </p>
          <p className="announcement-apology">
            ბოდიშს გიხდით შექმნილი უხერხულობისთვის და გმადლობთ გაგებისთვის.
          </p>
        </div>

        <button className="announcement-close-btn" onClick={handleClose}>
          გასაგებია
        </button>

        <p className="announcement-signature">SoulArt-ის გუნდი 🎨</p>
      </div>
    </div>
  );
};
