/**
 * PWA Link Handler
 * Intercepts external links and makes them open within the PWA
 */

export class PWALinkHandler {
  private static instance: PWALinkHandler;
  private isInitialized = false;

  static getInstance(): PWALinkHandler {
    if (!PWALinkHandler.instance) {
      PWALinkHandler.instance = new PWALinkHandler();
    }
    return PWALinkHandler.instance;
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Check if we're in a PWA context
    if (!this.isPWA()) {
      console.log('[PWA] Not in PWA mode, skipping link interception');
      return;
    }

    this.setupLinkInterception();
    this.handleExternalUrlParameter();
    this.isInitialized = true;
    console.log('[PWA] Link handler initialized');
  }

  private isPWA(): boolean {
    // Check if running in standalone mode (PWA)
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - standalone is iOS specific property
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  private setupLinkInterception(): void {
    // Intercept all link clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;

      if (!link || !link.href) {
        return;
      }

      const url = new URL(link.href);
      const currentOrigin = window.location.origin;

      // Only intercept external links
      if (url.origin !== currentOrigin) {
        event.preventDefault();
        this.handleExternalLink(link.href);
        return;
      }

      // Handle same-origin links with special attributes
      if (link.hasAttribute('data-pwa-intercept')) {
        event.preventDefault();
        this.navigateInPWA(link.href);
      }
    });

    // Intercept form submissions that might navigate away
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const action = form.action;

      if (action) {
        const url = new URL(action);
        const currentOrigin = window.location.origin;

        // Only intercept external form submissions
        if (url.origin !== currentOrigin && form.method.toLowerCase() === 'get') {
          event.preventDefault();
          this.handleExternalLink(action);
        }
      }
    });
  }

  private handleExternalLink(url: string): void {
    console.log('[PWA] Intercepting external link:', url);

    // Try to handle the link within the PWA
    try {
      // For social media and common sites, we might want to open them internally
      if (this.shouldOpenInternally(url)) {
        this.navigateInPWA(`/external?url=${encodeURIComponent(url)}`);
      } else {
        // For other external links, show a confirmation or open in system browser
        this.showExternalLinkDialog(url);
      }
    } catch (error) {
      console.error('[PWA] Error handling external link:', error);
      // Fallback to opening in system browser
      window.open(url, '_blank');
    }
  }

  private shouldOpenInternally(url: string): boolean {
    // Define patterns for URLs that should open within the PWA
    const internalPatterns = [
      /facebook\.com/,
      /instagram\.com/,
      /twitter\.com/,
      /x\.com/,
      /linkedin\.com/,
      /youtube\.com/,
      /youtu\.be/,
      /tiktok\.com/,
    ];

    return internalPatterns.some(pattern => pattern.test(url));
  }

  private navigateInPWA(url: string): void {
    // Send message to service worker to handle navigation
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'NAVIGATE_TO_URL',
        url: url
      });
    } else {
      // Fallback to direct navigation
      window.location.href = url;
    }
  }

  private showExternalLinkDialog(url: string): void {
    // Create a simple confirmation dialog
    const dialog = document.createElement('div');
    dialog.className = 'pwa-external-link-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 90vw;
      text-align: center;
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;

    dialog.innerHTML = `
      <h3>გარე ბმული</h3>
      <p>თქვენ ეცდებით გარე საიტზე გადასვლას:</p>
      <p style="word-break: break-all; font-size: 0.9em; color: #666;">${url}</p>
      <div style="margin-top: 20px;">
        <button id="pwa-open-external" style="margin-right: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px;">გახსნა</button>
        <button id="pwa-cancel" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px;">გაუქმება</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // Handle dialog buttons
    const openBtn = dialog.querySelector('#pwa-open-external') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#pwa-cancel') as HTMLButtonElement;

    openBtn?.addEventListener('click', () => {
      window.open(url, '_blank');
      this.closeDialog(overlay, dialog);
    });

    cancelBtn?.addEventListener('click', () => {
      this.closeDialog(overlay, dialog);
    });

    overlay.addEventListener('click', () => {
      this.closeDialog(overlay, dialog);
    });
  }

  private closeDialog(overlay: HTMLElement, dialog: HTMLElement): void {
    document.body.removeChild(overlay);
    document.body.removeChild(dialog);
  }

  private handleExternalUrlParameter(): void {
    // Check if we have an external URL parameter (from service worker redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const externalUrl = urlParams.get('external_url');

    if (externalUrl) {
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('external_url');
      window.history.replaceState({}, '', newUrl.toString());

      // Show the external link dialog
      this.showExternalLinkDialog(decodeURIComponent(externalUrl));
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PWALinkHandler.getInstance().init();
    });
  } else {
    PWALinkHandler.getInstance().init();
  }
}

export default PWALinkHandler;