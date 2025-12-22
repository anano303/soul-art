"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Cloud,
  Settings,
  Upload,
  Archive,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Info,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./cloudinary-migration.css";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecretMasked: string;
}

interface RetiredCloud {
  cloudName: string;
  retiredAt: string;
  migratedToCloud: string;
}

interface MigrationProgress {
  migrationId: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  totalUrls: number;
  copiedUrls: number;
  failedUrls: number;
  skippedUrls: number;
  percentage: number;
  startedAt: string;
  completedAt?: string;
  recentErrors: { url: string; error: string }[];
}

interface ConfigData {
  activeConfig: CloudinaryConfig | null;
  retiredClouds: RetiredCloud[];
  urlsToMigrate: number;
}

const POLL_INTERVAL = 5000; // 5 seconds

export function CloudinaryMigrationDashboard() {
  // State
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [migrationProgress, setMigrationProgress] =
    useState<MigrationProgress | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Form state
  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/admin/cloudinary/config");
      if (response.ok) {
        const data = await response.json();
        setConfigData(data);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch migration progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        "/admin/cloudinary/migration/progress"
      );
      if (response.ok) {
        const data = await response.json();
        setIsMigrating(data.inProgress);
        setMigrationProgress(data.progress);

        // If migration just completed, refresh config
        if (!data.inProgress && migrationProgress?.status === "in_progress") {
          fetchConfig();
        }
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  }, [fetchConfig, migrationProgress?.status]);

  // Initial load
  useEffect(() => {
    fetchConfig();
    fetchProgress();
  }, [fetchConfig, fetchProgress]);

  // Polling for progress
  useEffect(() => {
    if (!isMigrating) return;

    const interval = setInterval(fetchProgress, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isMigrating, fetchProgress]);

  // Validate credentials
  const handleValidate = async () => {
    if (!cloudName || !apiKey || !apiSecret) {
      setFormError("All fields are required");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setFormError(null);

    try {
      const response = await fetchWithAuth("/admin/cloudinary/validate", {
        method: "POST",
        body: JSON.stringify({ cloudName, apiKey, apiSecret }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data.valid);
        if (!data.valid) {
          setFormError("Invalid credentials. Please check and try again.");
        }
      }
    } catch (error) {
      setFormError("Failed to validate credentials");
      setValidationResult(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Start migration
  const handleStartMigration = async () => {
    if (!cloudName || !apiKey || !apiSecret) {
      setFormError("All fields are required");
      return;
    }

    setFormError(null);

    try {
      const response = await fetchWithAuth(
        "/admin/cloudinary/migration/start",
        {
          method: "POST",
          body: JSON.stringify({ cloudName, apiKey, apiSecret }),
        }
      );

      if (response.ok) {
        setIsMigrating(true);
        // Clear form
        setCloudName("");
        setApiKey("");
        setApiSecret("");
        setValidationResult(null);
        // Start polling
        fetchProgress();
      } else {
        const data = await response.json();
        setFormError(data.message || "Failed to start migration");
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to start migration"
      );
    }
  };

  // Cancel migration
  const handleCancelMigration = async () => {
    if (!confirm("Are you sure you want to cancel the migration?")) return;

    try {
      const response = await fetchWithAuth(
        "/admin/cloudinary/migration/cancel",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setIsMigrating(false);
        fetchProgress();
        fetchConfig();
      }
    } catch (error) {
      console.error("Failed to cancel migration:", error);
    }
  };

  // Continue migration
  const handleContinueMigration = async () => {
    try {
      const response = await fetchWithAuth(
        "/admin/cloudinary/migration/continue",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setIsMigrating(true);
        fetchProgress();
      } else {
        const data = await response.json();
        setFormError(data.message || "Failed to continue migration");
      }
    } catch (error) {
      setFormError("Failed to continue migration");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ka-GE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="cloudinary-container">
        <div className="loading-container">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">Loading Cloudinary settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cloudinary-container">
      {/* Header */}
      <div className="cloudinary-header">
        <div className="header-content">
          <div className="header-title-section">
            <Cloud className="header-icon" />
            <div>
              <h1 className="header-title">Cloudinary Migration</h1>
              <p className="header-subtitle">
                Manage Cloudinary accounts and migrate assets between them
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Configuration */}
      <div className="current-config-card">
        <div className="config-card-header">
          <CheckCircle2 className="config-icon" size={24} />
          <h3>Current Configuration</h3>
        </div>

        {configData?.activeConfig ? (
          <div className="config-details">
            <div className="config-item">
              <div className="config-label">Cloud Name</div>
              <div className="config-value">
                {configData.activeConfig.cloudName}
              </div>
            </div>
            <div className="config-item">
              <div className="config-label">API Key</div>
              <div className="config-value">
                {configData.activeConfig.apiKey}
              </div>
            </div>
            <div className="config-item">
              <div className="config-label">API Secret</div>
              <div className="config-value">
                {configData.activeConfig.apiSecretMasked}
              </div>
            </div>
            <div className="config-item">
              <div className="config-label">URLs with Old Cloud Names</div>
              <div className="config-value">{configData.urlsToMigrate}</div>
            </div>
          </div>
        ) : (
          <p className="no-config">
            No active Cloudinary configuration found. Enter new credentials
            below to set up.
          </p>
        )}
      </div>

      {/* Migration Progress (if active) */}
      {migrationProgress && (
        <div className="progress-card">
          <div className="progress-card-header">
            <div className="progress-title-section">
              {migrationProgress.status === "in_progress" ? (
                <Loader2 className="progress-icon" size={24} />
              ) : migrationProgress.status === "completed" ? (
                <CheckCircle2 className="progress-icon" size={24} style={{ animation: 'none', color: '#22c55e' }} />
              ) : (
                <XCircle className="progress-icon" size={24} style={{ animation: 'none', color: '#ef4444' }} />
              )}
              <h3>Migration Status</h3>
            </div>
            <span className={`status-badge ${migrationProgress.status}`}>
              {migrationProgress.status.replace("_", " ")}
            </span>
          </div>

          <div className="progress-stats">
            <div className="stat-item">
              <div className="stat-value">{migrationProgress.totalUrls}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-item success">
              <div className="stat-value">{migrationProgress.copiedUrls}</div>
              <div className="stat-label">Copied</div>
            </div>
            <div className="stat-item skipped">
              <div className="stat-value">{migrationProgress.skippedUrls}</div>
              <div className="stat-label">Skipped</div>
            </div>
            <div className="stat-item failed">
              <div className="stat-value">{migrationProgress.failedUrls}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${migrationProgress.percentage}%` }}
            />
            <span className="progress-bar-text">
              {migrationProgress.percentage}%
            </span>
          </div>

          <div className="progress-actions">
            {migrationProgress.status === "in_progress" && (
              <button className="btn btn-danger" onClick={handleCancelMigration}>
                <Pause size={18} />
                Cancel Migration
              </button>
            )}
            {(migrationProgress.status === "cancelled" ||
              migrationProgress.status === "failed") && (
              <button
                className="btn btn-success"
                onClick={handleContinueMigration}
              >
                <Play size={18} />
                Continue Migration
              </button>
            )}
            <button className="btn btn-secondary" onClick={fetchProgress}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          {migrationProgress.recentErrors.length > 0 && (
            <div className="recent-errors">
              <h4>
                <AlertCircle size={16} />
                Recent Errors
              </h4>
              <div className="error-list">
                {migrationProgress.recentErrors.map((err, i) => (
                  <div key={i} className="error-item">
                    <div className="error-url">{err.url}</div>
                    <div className="error-message">{err.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Migration Form */}
      {!isMigrating && (
        <div className="migration-form-card">
          <div className="form-card-header">
            <Upload className="form-icon" size={24} />
            <h3>Start New Migration</h3>
          </div>

          <div className="alert alert-info">
            <Info className="alert-icon" size={18} />
            <div>
              Enter the credentials for your <strong>new</strong> Cloudinary
              account. All assets will be copied from the current account to the
              new one. URLs in the database will remain unchanged - the
              interceptor will transform them at runtime.
            </div>
          </div>

          {formError && (
            <div className="alert alert-warning">
              <AlertCircle className="alert-icon" size={18} />
              <div>{formError}</div>
            </div>
          )}

          <div className="migration-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cloudName">Cloud Name</label>
                <input
                  id="cloudName"
                  type="text"
                  placeholder="e.g., my-new-cloud"
                  value={cloudName}
                  onChange={(e) => {
                    setCloudName(e.target.value);
                    setValidationResult(null);
                  }}
                  disabled={isMigrating}
                />
              </div>
              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  id="apiKey"
                  type="text"
                  placeholder="e.g., 123456789012345"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setValidationResult(null);
                  }}
                  disabled={isMigrating}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="apiSecret">API Secret</label>
                <input
                  id="apiSecret"
                  type="password"
                  placeholder="Your API secret"
                  value={apiSecret}
                  onChange={(e) => {
                    setApiSecret(e.target.value);
                    setValidationResult(null);
                  }}
                  disabled={isMigrating}
                />
              </div>
            </div>

            {validationResult !== null && (
              <div
                className={`validation-status ${
                  validationResult ? "valid" : "invalid"
                }`}
              >
                {validationResult ? (
                  <>
                    <CheckCircle2 size={16} /> Credentials validated
                    successfully
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Invalid credentials
                  </>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={handleValidate}
                disabled={
                  isValidating || !cloudName || !apiKey || !apiSecret
                }
              >
                {isValidating ? (
                  <Loader2 size={18} className="spinning" />
                ) : (
                  <Settings size={18} />
                )}
                Validate Credentials
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartMigration}
                disabled={
                  !cloudName || !apiKey || !apiSecret || validationResult === false
                }
              >
                <Upload size={18} />
                Start Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retired Clouds */}
      <div className="retired-clouds-card">
        <div className="retired-card-header">
          <Archive className="retired-icon" size={24} />
          <h3>Retired Cloud Names</h3>
        </div>

        {configData?.retiredClouds && configData.retiredClouds.length > 0 ? (
          <table className="retired-table">
            <thead>
              <tr>
                <th>Cloud Name</th>
                <th>Retired At</th>
                <th>Migrated To</th>
              </tr>
            </thead>
            <tbody>
              {configData.retiredClouds.map((cloud, i) => (
                <tr key={i}>
                  <td className="cloud-name">{cloud.cloudName}</td>
                  <td>{formatDate(cloud.retiredAt)}</td>
                  <td className="cloud-name">{cloud.migratedToCloud}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-retired">No retired cloud names yet.</p>
        )}
      </div>
    </div>
  );
}
