import Script from "next/script";

const headBootstrapScript = `
(() => {
  const DESKTOP = "width=1440, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const MOBILE = "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const CLASS_NAME = "landscape-desktop-viewport";
  const STORAGE_KEY = "landscape-desktop-viewport-state";
  const CHUNK_RELOAD_KEY = "chunk-load-recovery-once";

  const shouldRecoverChunkError = (error) => {
    if (!error) return false;
    const message =
      typeof error === "string"
        ? error
        : typeof error.message === "string"
          ? error.message
          : "";
    return (
      message.includes("ChunkLoadError") ||
      message.includes("Loading chunk") ||
      message.includes("Failed to fetch dynamically imported module")
    );
  };

  const recoverChunkErrorOnce = () => {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
      return;
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  };

  window.addEventListener("error", (event) => {
    if (shouldRecoverChunkError(event.error)) {
      recoverChunkErrorOnce();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (shouldRecoverChunkError(event.reason)) {
      recoverChunkErrorOnce();
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

  applyViewport();
  window.addEventListener("pageshow", applyViewport);
  window.addEventListener("resize", applyViewport);
  window.addEventListener("orientationchange", applyViewport);
})();
`;

export function LandscapeDesktopViewportScript() {
  return (
    <Script id="landscape-desktop-viewport" strategy="beforeInteractive">
      {headBootstrapScript}
    </Script>
  );
}
