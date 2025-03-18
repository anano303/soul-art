import React from "react";
import "./loading.css";

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-wrapper">
        <div className="card">
          <div className="card-header">
            <div className="skeleton skeleton-header"></div>
          </div>
          <div className="card-content">
            <div className="skeleton-list">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-item"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
