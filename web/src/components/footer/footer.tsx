import React from "react";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">SoulArt</h3>
          <p className="footer-description">
            Discover and purchase unique art pieces from talented artists around the world. Create your personal gallery and become a collector or artist.
          </p>
        </div>
        <div className="footer-section">
          <h4 className="footer-subtitle">Quick Links</h4>
          <ul className="footer-links">
            <li><a href="/about" className="footer-link">ჩვენს შესახებ</a></li>
            <li><a href="/contact" className="footer-link">კონტაქტი</a></li>
            <li><a href="/shop" className="footer-link">ნამუშევრები</a></li>
            <li><a href="/forum" className="footer-link">ფორუმი</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4 className="footer-subtitle">Follow Us</h4>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon facebook">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon instagram">Instagram</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon twitter">Twitter</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} SoulArt. All rights reserved.</p>
      </div>
    </footer>
  );
}