import { useState } from 'react';
import { Plus, Edit, Eye, Trash2, Send } from 'lucide-react';
import './CmsPage.css';

interface Guide {
  id: number;
  title: string;
  category: string;
  status: 'Published' | 'Draft';
  views: number;
  lastUpdated: string;
}

const mockGuides: Guide[] = [
  {
    id: 1,
    title: 'Flood Safety Guidelines',
    category: 'Safety',
    status: 'Published',
    views: 1248,
    lastUpdated: '2 days ago',
  },
  {
    id: 2,
    title: 'Earthquake Preparedness',
    category: 'Safety',
    status: 'Published',
    views: 892,
    lastUpdated: '1 week ago',
  },
  {
    id: 3,
    title: 'Evacuation Procedures',
    category: 'Protocol',
    status: 'Published',
    views: 654,
    lastUpdated: '3 days ago',
  },
  {
    id: 4,
    title: 'Typhoon Safety Tips',
    category: 'Safety',
    status: 'Draft',
    views: 0,
    lastUpdated: '5 hours ago',
  },
];

const CmsPage: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>(mockGuides);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notification, setNotification] = useState({ type: 'alert', message: '' });

  const togglePublish = (id: number) => {
    setGuides(g =>
      g.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published' }
          : item
      )
    );
  };

  const deleteGuide = (id: number) => {
    setGuides(g => g.filter(item => item.id !== id));
  };

  return (
    <div className="cms-page">

      {/* Header */}
      <div className="cms-header">
        <h1>Content Management System</h1>
        <div className="cms-actions">
          <button className="btn secondary" onClick={() => setShowNotificationDialog(true)}>
            <Send size={16} /> Send Notification
          </button>
          <button className="btn primary" onClick={() => setShowGuideDialog(true)}>
            <Plus size={16} /> Create Guide
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Views</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guides.map(guide => (
              <tr key={guide.id}>
                <td>{guide.title}</td>
                <td>{guide.category}</td>
                <td>
                  <span className={`badge ${guide.status}`}>
                    {guide.status}
                  </span>
                </td>
                <td>{guide.views}</td>
                <td>{guide.lastUpdated}</td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn"><Edit size={16} /></button>
                    <button className="icon-btn" onClick={() => togglePublish(guide.id)}>
                      <Eye size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={() => deleteGuide(guide.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Guide Modal */}
      {showGuideDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Guide</h2>

            <label>Title</label>
            <input type="text" placeholder="Enter guide title" />

            <label>Category</label>
            <select>
              <option>Safety</option>
              <option>Protocol</option>
              <option>Preparedness</option>
            </select>

            <label>Content</label>
            <textarea rows={5} />

            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowGuideDialog(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={() => setShowGuideDialog(false)}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Send Notification</h2>

            <label>Type</label>
            <select
              value={notification.type}
              onChange={e => setNotification({ ...notification, type: e.target.value })}>
              <option value="alert">Alert</option>
              <option value="warning">Warning</option>
              <option value="information">Information</option>
              <option value="emergency">Emergency</option>
            </select>

            <label>Message</label>
            <textarea
              rows={5}
              value={notification.message}
              onChange={e => setNotification({ ...notification, message: e.target.value })} />

            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowNotificationDialog(false)}>
                Cancel
              </button>
              <button className="btn primary">
                <Send size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default CmsPage;

