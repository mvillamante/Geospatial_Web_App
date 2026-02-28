import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalTooltipProps {
  show: boolean;
  content: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Renders a tooltip in a portal (document.body) so it appears above the Leaflet map.
 * Position is derived from the trigger element; no setState in ref callbacks to avoid infinite loops.
 */
export const PortalTooltip: React.FC<PortalTooltipProps> = ({
  show,
  content,
  triggerRef,
  className = "help-tooltip left-panel-tooltip-portal",
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  };

  useLayoutEffect(() => {
    if (!show) {
      setRect(null);
      return;
    }
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  }, [show, triggerRef]);

  useEffect(() => {
    if (!show) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show]);

  if (!show || !rect) return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
    >
      {content}
    </div>,
    document.body
  );
};

export default PortalTooltip;
