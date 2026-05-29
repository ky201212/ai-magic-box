"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const LANDSCAPE_STAGE_WIDTH = 1440;
const LANDSCAPE_STAGE_HEIGHT = 1100;
const LANDSCAPE_STAGE_GUTTER = 20;

function isCompactLandscapeViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  const shortSide = Math.min(window.screen.width, window.screen.height);
  const isLandscape = window.innerWidth > window.innerHeight;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  return isTouchDevice && isLandscape && shortSide <= 1100;
}

export function LandscapeDesktopStage({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    const syncStage = () => {
      const compactLandscape = isCompactLandscapeViewport();
      setIsCompactLandscape(compactLandscape);

      if (!compactLandscape) {
        setStageScale(1);
        return;
      }

      const availableWidth = Math.max(
        window.innerWidth - LANDSCAPE_STAGE_GUTTER,
        320,
      );
      const availableHeight = Math.max(
        window.innerHeight - LANDSCAPE_STAGE_GUTTER,
        320,
      );
      const nextScale = Math.min(
        availableWidth / LANDSCAPE_STAGE_WIDTH,
        availableHeight / LANDSCAPE_STAGE_HEIGHT,
      );

      setStageScale(Number.isFinite(nextScale) ? Math.max(nextScale, 0.32) : 1);
    };

    syncStage();
    window.addEventListener("resize", syncStage);
    window.addEventListener("orientationchange", syncStage);

    return () => {
      window.removeEventListener("resize", syncStage);
      window.removeEventListener("orientationchange", syncStage);
    };
  }, []);

  const shouldBypassStage = pathname?.startsWith("/workshop");

  if (!isCompactLandscape || shouldBypassStage) {
    return <>{children}</>;
  }

  return (
    <div className="landscape-site-shell">
      <div
        className="landscape-site-stage"
        style={{
          width: `${LANDSCAPE_STAGE_WIDTH * stageScale}px`,
          height: `${LANDSCAPE_STAGE_HEIGHT * stageScale}px`,
        }}
      >
        <div
          className="landscape-site-canvas"
          style={{
            width: `${LANDSCAPE_STAGE_WIDTH}px`,
            minWidth: `${LANDSCAPE_STAGE_WIDTH}px`,
            height: `${LANDSCAPE_STAGE_HEIGHT}px`,
            minHeight: `${LANDSCAPE_STAGE_HEIGHT}px`,
            transform: `scale(${stageScale})`,
            transformOrigin: "top center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
