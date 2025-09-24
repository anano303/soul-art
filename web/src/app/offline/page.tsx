"use client";

import Link from "next/link";
import "./offline.css";

export default function OfflinePage() {
  return (
    <div className="offline-container">
      <div className="offline-content">
        <div className="offline-icon">
          <div className="wifi-icon">
            <div className="wifi-bar"></div>
            <div className="wifi-bar"></div>
            <div className="wifi-bar"></div>
            <div className="wifi-slash"></div>
          </div>
        </div>

        <h1 className="offline-title">თქვენ ოფლაინ რეჟიმშიხართ</h1>

        <p className="offline-description">
          ინტერნეტ კავშირი არ არის ხელმისაწვდომი. გთხოვთ შეამოწმოთ თქვენი
          კავშირი და ისევ სცადოთ.
        </p>

        <div className="offline-actions">
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            <div className="button-icon">
              <div className="refresh-icon"></div>
            </div>
            თავიდან ცდა
          </button>

          <Link href="/" className="home-button">
            <div className="button-icon">
              <div className="home-icon"></div>
            </div>
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>

        <div className="offline-tips">
          <h3>რჩევები:</h3>
          <ul>
            <li>შეამოწმეთ Wi-Fi კავშირი</li>
            <li>შეამოწმეთ მობილური ინტერნეტი</li>
            <li>სცადეთ რამდენიმე წუთის შემდეგ</li>
          </ul>
        </div>

        <div className="offline-animation">
          <div className="pulse-circle"></div>
          <div className="pulse-circle pulse-2"></div>
          <div className="pulse-circle pulse-3"></div>
        </div>
      </div>
    </div>
  );
}
