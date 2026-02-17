interface MapLayerItem {
  key: string;
  name: string;
}

interface DbMapLayersProps {
  visibleMapLayers: { group: string; items: MapLayerItem[] }[];
  layerDisplayNames: Record<string, string>;
  activeLayers: string[];
  toggleLayer: (layer: string) => void;
}

const DbMapLayers: React.FC<DbMapLayersProps> = ({
  visibleMapLayers,
  layerDisplayNames,
  activeLayers,
  toggleLayer,
}) => (
  <div className="maplayer-container panel-card">
    <h4>Map Layers</h4>
    {visibleMapLayers.map((section, index) => (
      <div key={section.group}>
        <p className="layer-group">{section.group}</p>
        {section.items.map((item) => (
          <div className="layer-item" key={item.key}>
            <span>{item.name}</span>
            <button
              className={`toggle-btn ${activeLayers.includes(item.key) ? "active" : ""}`}
              onClick={() => toggleLayer(item.key)}
            />
          </div>
        ))}
        {index < visibleMapLayers.length - 1 && <hr className="section-divider" />}
      </div>
    ))}
  </div>
);

export default DbMapLayers;
