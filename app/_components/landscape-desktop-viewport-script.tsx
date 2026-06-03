import Script from "next/script";

const headBootstrapScript = `
(() => {
  const DESKTOP = "width=1440, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const MOBILE = "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const CLASS_NAME = "landscape-desktop-viewport";
  const STORAGE_KEY = "landscape-desktop-viewport-state";
  const CHUNK_RELOAD_KEY = "chunk-load-recovery-once";
  const ACTION_RELOAD_KEY = "server-action-recovery-once";
  const STYLESHEET_RELOAD_KEY = "stylesheet-recovery-once";

  const getErrorMessage = (error) => {
    if (!error) return "";
    if (typeof error === "string") return error;
    if (typeof error.message === "string") return error.message;
    return "";
  };

  const shouldRecoverChunkError = (error) => {
    const message = getErrorMessage(error);
    if (!message) return false;
    return (
      message.includes("ChunkLoadError") ||
      message.includes("Loading chunk") ||
      message.includes("Failed to fetch dynamically imported module")
    );
  };

  const shouldRecoverServerActionError = (error) => {
    const message = getErrorMessage(error);
    if (!message) return false;
    return (
      message.includes("Failed to find Server Action") ||
      message.includes("failed to find the requested server action") ||
      message.includes("This request might be from an older or newer deployment")
    );
  };

  const isBareCssAssetPath = (href) => {
    if (!href || typeof href !== "string") {
      return false;
    }

    if (
      href.startsWith("/") ||
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//") ||
      href.startsWith("blob:") ||
      href.startsWith("data:")
    ) {
      return false;
    }

    const cleanHref = href.split("#")[0]?.split("?")[0] ?? href;
    return /^[A-Za-z0-9._-]+\\.css$/.test(cleanHref);
  };

  const toNormalizedNextStylesheetHref = (href) => {
    if (!href || typeof href !== "string") {
      return null;
    }

    if (href.includes("/_next/static/")) {
      return href;
    }

    if (isBareCssAssetPath(href)) {
      return "/_next/static/chunks/" + href.replace(/^\\/+/, "");
    }

    if (href.startsWith("static/")) {
      return "/_next/" + href.replace(/^\\/+/, "");
    }

    return null;
  };

  const retryStylesheetWithNormalizedHref = (link) => {
    if (!(link instanceof HTMLLinkElement)) {
      return false;
    }

    if (link.dataset.nextStylesheetRetry === "1") {
      return false;
    }

    const rawHref =
      link.getAttribute("href") ||
      (typeof link.href === "string" ? link.href : "");
    const normalizedHref = toNormalizedNextStylesheetHref(rawHref);

    if (!normalizedHref || normalizedHref === rawHref) {
      return false;
    }

    link.dataset.nextStylesheetRetry = "1";
    link.setAttribute("href", normalizedHref);
    return true;
  };

  const normalizeExistingStylesheetLinks = () => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    links.forEach((link) => {
      retryStylesheetWithNormalizedHref(link);
    });
  };

  const recoverOnce = (storageKey) => {
    if (sessionStorage.getItem(storageKey) === "1") {
      return false;
    }

    sessionStorage.setItem(storageKey, "1");
    window.location.reload();
    return true;
  };

  const recoverChunkErrorOnce = () => {
    recoverOnce(CHUNK_RELOAD_KEY);
  };

  const recoverServerActionErrorOnce = () => {
    recoverOnce(ACTION_RELOAD_KEY);
  };

  const recoverStylesheetErrorOnce = () => {
    recoverOnce(STYLESHEET_RELOAD_KEY);
  };

  const shouldRecoverStylesheetError = (target) => {
    if (!(target instanceof HTMLLinkElement)) {
      return false;
    }

    const rel = typeof target.rel === "string" ? target.rel : "";
    return rel.includes("stylesheet");
  };

  const hasLoadedNextStylesheet = () => {
    const links = Array.from(
      document.querySelectorAll('link[rel="stylesheet"][href*="/_next/static/"]')
    );

    if (!links.length) {
      return false;
    }

    return links.some((link) => {
      try {
        const sheet = link.sheet;
        return Boolean(sheet && sheet.cssRules && sheet.cssRules.length >= 0);
      } catch {
        return Boolean(link.sheet);
      }
    });
  };

  const verifyStylesheetsAfterLoad = () => {
    window.setTimeout(() => {
      if (!hasLoadedNextStylesheet()) {
        recoverStylesheetErrorOnce();
      }
    }, 1200);
  };

  window.addEventListener("error", (event) => {
    if (shouldRecoverStylesheetError(event.target)) {
      if (retryStylesheetWithNormalizedHref(event.target)) {
        return;
      }
      recoverStylesheetErrorOnce();
      return;
    }

    if (shouldRecoverChunkError(event.error)) {
      recoverChunkErrorOnce();
      return;
    }

    if (shouldRecoverServerActionError(event.error)) {
      recoverServerActionErrorOnce();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (shouldRecoverChunkError(event.reason)) {
      recoverChunkErrorOnce();
      return;
    }

    if (shouldRecoverServerActionError(event.reason)) {
      recoverServerActionErrorOnce();
    }
  });

  const ensureViewportMeta = () => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.prepend(meta);
    }
    return meta;
  };

  const isCompactLandscape = () => {
    const shortSide = Math.min(window.screen.width, window.screen.height);
    const longSide = Math.max(window.screen.width, window.screen.height);
    const isLandscape = window.innerWidth > window.innerHeight;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    return isTouchDevice && isLandscape && shortSide <= 1100 && longSide <= 2600;
  };

  const applyViewport = () => {
    const viewportMeta = ensureViewportMeta();
    const useDesktopViewport = isCompactLandscape();
    viewportMeta.setAttribute("content", useDesktopViewport ? DESKTOP : MOBILE);
    document.documentElement.classList.toggle(CLASS_NAME, useDesktopViewport);

    const nextState = useDesktopViewport ? "desktop" : "mobile";
    const prevState = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.setItem(STORAGE_KEY, nextState);

    if (prevState && prevState !== nextState) {
      window.location.reload();
    }
  };

  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }
  if (sessionStorage.getItem(ACTION_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(ACTION_RELOAD_KEY);
  }
  if (sessionStorage.getItem(STYLESHEET_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(STYLESHEET_RELOAD_KEY);
  }

  applyViewport();
  normalizeExistingStylesheetLinks();
  window.addEventListener("load", verifyStylesheetsAfterLoad, { once: true });
  window.addEventListener("pageshow", applyViewport);
  window.addEventListener("resize", applyViewport);
  window.addEventListener("orientationchange", applyViewport);
})();
`;

export function LandscapeDesktopViewportScript(input: {
  nonce?: string | null;
}) {
  return (
    <Script
      id="landscape-desktop-viewport"
      nonce={input.nonce ?? undefined}
      strategy="beforeInteractive"
    >
      {headBootstrapScript}
    </Script>
  );
}
