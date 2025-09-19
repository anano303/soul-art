/**
 * CSS Module Lazy Loader
 * Helps components load their CSS only when they are actually rendered
 */

type CSSModule = {
  default: string;
};

const loadedModules = new Set<string>();

export const loadCSSModule = async (
  importFn: () => Promise<CSSModule>
): Promise<string> => {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.warn("Failed to load CSS module:", error);
    return "";
  }
};

export const createLazyCSS = (cssPath: string) => {
  return {
    load: () => {
      if (loadedModules.has(cssPath)) return;

      loadedModules.add(cssPath);

      // Create link element for CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssPath;
      link.onload = () => {
        console.log(`Lazy loaded CSS: ${cssPath}`);
      };

      document.head.appendChild(link);
    },

    unload: () => {
      if (!loadedModules.has(cssPath)) return;

      const existingLink = document.querySelector(`link[href="${cssPath}"]`);
      if (existingLink) {
        existingLink.remove();
        loadedModules.delete(cssPath);
      }
    },
  };
};

// Export a hook for easier component usage
export const useLazyCSSModule = (
  cssPath: string,
  shouldLoad: boolean = true
) => {
  const lazyCSS = createLazyCSS(cssPath);

  if (typeof window !== "undefined" && shouldLoad) {
    lazyCSS.load();
  }

  return lazyCSS;
};
