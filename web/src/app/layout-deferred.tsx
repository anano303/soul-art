"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// All non-critical components loaded with ssr: false to prevent hydration blocking
const MessengerChatWrapper = dynamic(() => import("@/components/MessengerChat/MessengerChatWrapper"), { ssr: false });
const MetaPixel = dynamic(() => import("@/components/MetaPixel"), { ssr: false });
const NetworkStatus = dynamic(() => import("@/components/network-status/network-status").then(m => ({ default: m.NetworkStatus })), { ssr: false });
const VisitorTracker = dynamic(() => import("@/components/visitor-tracker").then(m => ({ default: m.VisitorTracker })), { ssr: false });
const IOSGesturePrevention = dynamic(() => import("@/components/ios-gesture-prevention").then(m => ({ default: m.IOSGesturePrevention })), { ssr: false });
const SalesTracker = dynamic(() => import("@/components/SalesTracker").then(m => ({ default: m.SalesTracker })), { ssr: false });
const SalesManagerBanner = dynamic(() => import("@/components/sales-manager-banner/sales-manager-banner"), { ssr: false });
const PWAInstallPrompt = dynamic(() => import("@/components/pwa-install-prompt/pwa-install-prompt").then(m => ({ default: m.PWAInstallPrompt })), { ssr: false });
const PushNotificationManager = dynamic(() => import("@/components/push-notifications/push-notifications").then(m => ({ default: m.PushNotificationManager })), { ssr: false });
const PWAManager = dynamic(() => import("@/components/pwa-manager"), { ssr: false });
const CampaignConsentPrompt = dynamic(() => import("@/components/campaign-consent/campaign-consent-prompt").then(m => ({ default: m.CampaignConsentPrompt })), { ssr: false });
const ReferralCodeInput = dynamic(() => import("@/components/referral-code-input/referral-code-input").then(m => ({ default: m.ReferralCodeInput })), { ssr: false });
const CallRequestPopup = dynamic(() => import("@/components/call-request-popup/call-request-popup").then(m => ({ default: m.CallRequestPopup })), { ssr: false });
const ImpersonationBanner = dynamic(() => import("@/components/ImpersonationBanner/ImpersonationBanner").then(m => ({ default: m.ImpersonationBanner })), { ssr: false });
const InsurancePromo = dynamic(() => import("@/components/insurance-promo/insurance-promo"), { ssr: false });
const GoogleAnalytics = dynamic(() => import("@/components/GoogleAnalytics"), { ssr: false });
const VercelAnalytics = dynamic(() => import("@/components/VercelAnalytics"), { ssr: false });
const GA4UserTracker = dynamic(() => import("@/components/ga4-user-tracker").then(m => ({ default: m.GA4UserTracker })), { ssr: false });
const PageViewTracker = dynamic(() => import("@/components/page-view-tracker").then(m => ({ default: m.PageViewTracker })), { ssr: false });
const FloatingCartIcon = dynamic(() => import("@/components/floating-cart-icon/floating-cart-icon").then(m => ({ default: m.FloatingCartIcon })), { ssr: false });
const MobileBottomNav = dynamic(() => import("@/components/mobile-bottom-nav/mobile-bottom-nav").then(m => ({ default: m.MobileBottomNav })), { ssr: false });
const Footer = dynamic(() => import("@/components/footer/footer"), { ssr: false });

// Error boundary for messenger chat
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

import React from "react";

/**
 * Layout components that don't need server rendering.
 * By keeping them in a "use client" boundary with ssr:false,
 * they won't block the main thread during initial hydration.
 */
export function LayoutDeferredComponents() {
  return (
    <>
      {/* GA4 User ID Tracking */}
      <GA4UserTracker />

      {/* GA4 Page View and User Path Tracking */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {/* Visitor Tracking with IP */}
      <VisitorTracker />

      {/* Sales Manager Referral Tracking */}
      <Suspense fallback={null}>
        <SalesTracker />
      </Suspense>

      {/* iOS Back Swipe Prevention */}
      <IOSGesturePrevention />

      {/* Sales Manager Facebook Group Banner */}
      <SalesManagerBanner />

      {/* Floating Cart and Bottom Nav */}
      <FloatingCartIcon />
      <MobileBottomNav />

      {/* Floating Promo Code Input */}
      <ReferralCodeInput variant="floating" />

      {/* Campaign Consent Prompt for Sellers */}
      <CampaignConsentPrompt />

      {/* Call Request Popup */}
      <CallRequestPopup />

      {/* Admin Impersonation Banner */}
      <ImpersonationBanner />

      {/* Insurance Promo */}
      <InsurancePromo />

      {/* Push Notifications */}
      <PushNotificationManager />

      {/* PWA Manager */}
      <PWAManager />

      {/* Messenger Chat */}
      <ErrorBoundary>
        <MessengerChatWrapper />
      </ErrorBoundary>

      {/* Network Status Indicator */}
      <NetworkStatus />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Google Analytics */}
      <GoogleAnalytics />

      {/* Meta Pixel */}
      <Suspense fallback={null}>
        <MetaPixel />
      </Suspense>

      {/* Vercel Analytics */}
      <VercelAnalytics />
    </>
  );
}

export function LayoutFooter() {
  return <Footer />;
}
