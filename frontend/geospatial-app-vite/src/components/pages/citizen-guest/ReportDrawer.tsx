interface ReportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  if (!open) return null;

  return (
    <div className="drawer-overlay">
      <div className="drawer">

        <div className="drawer-header">
          <h3>Report an Incident</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-content">
          <label>Category</label>
          <select>
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="landslide">Landslide</option>
            <option value="accident">Accident</option>
            <option value="others">Others</option>
          </select>

          <label>Description</label>
          <textarea
            placeholder="Describe what you see (smoke, injuries, blocked roads, etc.)"
            rows={4}
          />

          <label>Detected Location</label>
          <input
            value="Lat: 14.5995, Lng: 120.9842"
            disabled
          />

          <label>Risk Level</label>
          <select>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="drawer-actions">
          <button className="submit-btn">Submit Report</button>
          <button className="close-btn" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
}
