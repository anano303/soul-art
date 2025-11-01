"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { trackError } from "@/lib/ga4-analytics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);

    // Track error in GA4
    trackError(
      "page_error",
      error.message,
      error.stack || "No stack trace",
      {
        componentStack: errorInfo.componentStack,
      }
    );
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              background: "white",
              padding: "2rem",
              borderRadius: "1rem",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
              We&apos;re sorry, but something unexpected happened. The error has been logged and we&apos;ll look into it.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Reload Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: "1.5rem", textAlign: "left" }}>
                <summary style={{ cursor: "pointer", color: "#64748b", fontSize: "0.875rem" }}>
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#f8fafc",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    overflow: "auto",
                    maxHeight: "200px",
                  }}
                >
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
