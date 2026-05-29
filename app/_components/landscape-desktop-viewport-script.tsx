import Script from "next/script";

const viewportSwitcherScript = `
(() => {
  const DESKTOP = "width=1440, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const MOBILE = "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
  const CLASS_NAME = "landscape-desktop-viewport";

  const syncViewport = () => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;

    const useDesktopViewport = window.matchMedia(
      "(orientation: landscape) and (max-width: 1100px) and (pointer: coarse)"
    ).matches;

    viewportMeta.setAttribute("content", useDesktopViewport ? DESKTOP : MOBILE);
    document.documentElement.classList.toggle(CLASS_NAME, useDesktopViewport);
  };

  syncViewport();
  window.addEventListener("resize", syncViewport);
  window.addEventListener("orientationchange", syncViewport);
})();
`;

export function LandscapeDesktopViewportScript() {
  return (
    <Script id="landscape-desktop-viewport" strategy="beforeInteractive">
      {viewportSwitcherScript}
    </Script>
  );
}
