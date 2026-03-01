import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface MapLayerItem {
  key: string;
  name: string;
}

interface DbMapLayersProps {
  visibleMapLayers: { group: string; items: MapLayerItem[] }[];
  layerDisplayNames: Record<string, string>;
  layerTooltips?: Record<string, string>;
  activeLayers: string[];
  toggleLayer: (layer: string) => void;
}

const DbMapLayers: React.FC<DbMapLayersProps> = ({
  visibleMapLayers,
  layerDisplayNames: _layerDisplayNames,
  layerTooltips = {},
  activeLayers,
  toggleLayer,
}) => {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const updateTooltipPosition = () => {
    if (triggerRef.current) {
      setTooltipRect(triggerRef.current.getBoundingClientRect());
    }
  };

  useLayoutEffect(() => {
    if (!hoveredTooltip) {
      setTooltipRect(null);
      triggerRef.current = null;
      return;
    }
    if (triggerRef.current) {
      setTooltipRect(triggerRef.current.getBoundingClientRect());
    }
  }, [hoveredTooltip]);

  useEffect(() => {
    if (!hoveredTooltip) return;
    window.addEventListener("scroll", updateTooltipPosition, true);
    window.addEventListener("resize", updateTooltipPosition);
    return () => {
      window.removeEventListener("scroll", updateTooltipPosition, true);
      window.removeEventListener("resize", updateTooltipPosition);
    };
  }, [hoveredTooltip]);

  return (
    <div className="maplayer-container panel-card">
      <h4>Map Layers</h4>
      {visibleMapLayers.map((section, index) => (
        <div key={section.group}>
          <p className="layer-group">{section.group}</p>
          {section.items.map((item) => {
            const tooltip = layerTooltips[item.key];
            // const isDisabledByOther =
            //   (item.key === "Flood Zones" && activeLayers.includes("Landslide Risk")) ||
            //   (item.key === "Landslide Risk" && activeLayers.includes("Flood Zones"));
            return (
              <div className="layer-item" key={item.key}>
                <span className="layer-item-label">
                  {item.name}
                  {tooltip && (
                    <span
                      className="help-wrap"
                      onMouseEnter={() => {
                        setHoveredTooltip(item.key);
                        setTooltipContent(tooltip);
                      }}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <button
                        ref={(el) => {
                          if (hoveredTooltip === item.key) {
                            triggerRef.current = el;
                          }
                        }}
                        type="button"
                        className="help-icon small"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = hoveredTooltip === item.key ? null : item.key;
                          setHoveredTooltip(next);
                          setTooltipContent(next ? tooltip : "");
                          if (next) {
                            triggerRef.current = e.currentTarget;
                          }
                        }}
                        aria-label={`Info about ${item.name}`}
                      >
                        ?
                      </button>
                    </span>
                  )}
                </span>
                <button
                  className={`toggle-btn ${activeLayers.includes(item.key) ? "active" : ""}`}
                  onClick={() => toggleLayer(item.key)}
                />
              </div>
            );
          })}
          {index < visibleMapLayers.length - 1 && <hr className="section-divider" />}
        </div>
      ))}

      {hoveredTooltip && tooltipRect && createPortal(
        <div
          className="help-tooltip maplayer-tooltip maplayer-tooltip-portal"
          style={{
            position: "fixed",
            top: tooltipRect.bottom + 8,
            left: tooltipRect.left,
            zIndex: 2147483647,
          }}
        >
          {tooltipContent}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DbMapLayers;
