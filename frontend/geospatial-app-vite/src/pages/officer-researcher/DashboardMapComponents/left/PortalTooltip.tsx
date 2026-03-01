import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalTooltipProps {
  show: boolean;
  content: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  /** "bottom" = below trigger, left-aligned (extends right). "bottom-left" = below trigger, right-aligned (extends left, for right-edge panels) */
  placement?: "bottom" | "bottom-left";
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
  placement = "bottom",
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

  const style: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 8,
    zIndex: 2147483647,
    pointerEvents: "none",
  };

  if (placement === "bottom-left") {
    style.right = window.innerWidth - rect.left;
    style.left = "auto";
  } else {
    style.left = rect.left;
  }

  const resolvedClass = placement === "bottom-left"
    ? `${className} help-tooltip-right-edge`
    : className;

  return createPortal(
    <div className={resolvedClass} style={style}>
      {content}
    </div>,
    document.body
  );
};

export default PortalTooltip;
