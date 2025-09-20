"use client";

import { useEffect } from 'react';

export default function DynamicFavicon() {
  useEffect(() => {
    const updateFavicon = (isDark: boolean) => {
      const iconPath = isDark ? '/soulart_icon_white_fullsizes.ico' : '/soulart_icon_blue_fullsizes.ico';
      
      // Remove existing favicon links created by this component
      const existingLinks = document.querySelectorAll('link[data-dynamic-favicon="true"]');
      existingLinks.forEach(link => link.remove());

      // Create multiple favicon links for better Chrome compatibility
      const iconTypes = [
        { rel: 'icon', type: 'image/x-icon' },
        { rel: 'shortcut icon', type: 'image/x-icon' },
        { rel: 'apple-touch-icon', type: 'image/x-icon' },
        { rel: 'mask-icon', type: 'image/x-icon' }
      ];

      iconTypes.forEach(iconType => {
        const link = document.createElement('link');
        link.rel = iconType.rel;
        link.type = iconType.type;
        link.href = iconPath;
        link.setAttribute('data-dynamic-favicon', 'true');
        
        // Add color attribute for mask-icon
        if (iconType.rel === 'mask-icon') {
          link.setAttribute('color', isDark ? '#FFFFFF' : 'var(--primary-color, #012645)');
        }
        
        document.head.appendChild(link);
      });
    };

    // Check initial color scheme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    updateFavicon(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      updateFavicon(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return null;
}
