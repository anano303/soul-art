"use client";

import React, { useState } from "react";

interface PushTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PushTestPanel: React.FC<PushTestPanelProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState({
    newProduct: false,
    discount: false,
    orderStatus: false,
  });

  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testNewProduct = async () => {
    setLoading((prev) => ({ ...prev, newProduct: true }));
    try {
      const response = await fetch("/api/push/new-product", {
        method: "GET",
      });
      const data = await response.json();

      if (data.success) {
        addResult(
          `✅ ახალი პროდუქტი: ${data.stats.sent} მომხმარებელს გაეგზავნა`
        );
      } else {
        addResult(`❌ შეცდომა: ${data.message}`);
      }
    } catch (error) {
      addResult(`❌ ქსელის შეცდომა: ${error}`);
    } finally {
      setLoading((prev) => ({ ...prev, newProduct: false }));
    }
  };

  const testDiscount = async () => {
    setLoading((prev) => ({ ...prev, discount: true }));
    try {
      const response = await fetch("/api/push/discount", {
        method: "GET",
      });
      const data = await response.json();

      if (data.success) {
        addResult(`✅ ფასდაკლება: ${data.stats.sent} მომხმარებელს გაეგზავნა`);
      } else {
        addResult(`❌ შეცდომა: ${data.message}`);
      }
    } catch (error) {
      addResult(`❌ ქსელის შეცდომა: ${error}`);
    } finally {
      setLoading((prev) => ({ ...prev, discount: false }));
    }
  };

  const testOrderStatus = async () => {
    setLoading((prev) => ({ ...prev, orderStatus: true }));
    try {
      const response = await fetch("/api/push/order-status", {
        method: "GET",
      });
      const data = await response.json();

      if (data.success) {
        addResult(
          `✅ შეკვეთის სტატუსი: ${data.stats.sent} მომხმარებელს გაეგზავნა`
        );
      } else {
        addResult(`❌ შეცდომა: ${data.message}`);
      }
    } catch (error) {
      addResult(`❌ ქსელის შეცდომა: ${error}`);
    } finally {
      setLoading((prev) => ({ ...prev, orderStatus: false }));
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          fontFamily: "var(--font-firago), sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#012645",
              fontSize: "1.5rem",
              fontWeight: "700",
            }}
          >
            🧪 Push Notification ტესტები
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#666",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={testNewProduct}
            disabled={loading.newProduct}
            style={{
              padding: "12px 16px",
              backgroundColor: loading.newProduct ? "#ccc" : "#012645",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading.newProduct ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🎨 {loading.newProduct ? "იგზავნება..." : "ტესტი: ახალი პროდუქტი"}
          </button>

          <button
            onClick={testDiscount}
            disabled={loading.discount}
            style={{
              padding: "12px 16px",
              backgroundColor: loading.discount ? "#ccc" : "#e67e22",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading.discount ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            💰 {loading.discount ? "იგზავნება..." : "ტესტი: ფასდაკლება"}
          </button>

          <button
            onClick={testOrderStatus}
            disabled={loading.orderStatus}
            style={{
              padding: "12px 16px",
              backgroundColor: loading.orderStatus ? "#ccc" : "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading.orderStatus ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📦{" "}
            {loading.orderStatus ? "იგზავნება..." : "ტესტი: შეკვეთის სტატუსი"}
          </button>
        </div>

        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4
            style={{
              margin: 0,
              color: "#012645",
              fontSize: "1.1rem",
              fontWeight: "600",
            }}
          >
            📋 შედეგები
          </h4>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              style={{
                padding: "6px 12px",
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              გასუფთავება
            </button>
          )}
        </div>

        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "8px",
            padding: "12px",
            maxHeight: "200px",
            overflow: "auto",
            fontSize: "13px",
            fontFamily: "monospace",
          }}
        >
          {results.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic" }}>
              ტესტების შედეგები აქ გამოჩნდება...
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} style={{ marginBottom: "4px" }}>
                {result}
              </div>
            ))
          )}
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#e3f2fd",
            border: "1px solid #90caf9",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#1565c0",
          }}
        >
          💡 <strong>შენიშვნა:</strong> ეს ტესტები გაუშვებს push
          notification-ებს ყველა გამოწერილ მომხმარებელზე. პროდაქციაში
          გამოყენებამდე დარწმუნდით რომ მხოლოდ ტესტურ მომხმარებლებთან მუშაობთ.
        </div>
      </div>
    </div>
  );
};

export default PushTestPanel;
