import { useEffect, useState } from 'react';
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


const CmsPage: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [newGuide, setNewGuide] = useState({
    title: "",
    category: "Safety",
    content: "",
  });
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notification, setNotification] = useState({ type: 'alert', message: '' });

  useEffect(() => {
    fetch("/api/cms/guides/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          status: g.status === "published" ? "Published" : "Draft",
          views: g.views,
          lastUpdated: new Date(g.updated_at).toLocaleDateString(),
        }));

        setGuides(mapped);
      });
  }, []);

  const togglePublish = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/cms/guides/${id}/publish/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });


    setGuides(g =>
      g.map(item =>
        item.id === id
          ? { ...item, status: item.status === "Published" ? "Draft" : "Published" }
          : item
      )
    );
  };

  const deleteGuide = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/cms/guides/${id}/archive/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });


    setGuides(g => g.filter(item => item.id !== id));
  };

  const createGuide = async () => {
    const res = await fetch("/api/cms/guides/create/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({
        title: newGuide.title,
        category: newGuide.category,
        content: newGuide.content,
      }),
    });


    if (!res.ok) {
      alert("Failed to create guide");
      return;
    }

    const created = await res.json();

    // update UI immediately
    setGuides((prev) => [
      {
        id: created.id,
        title: created.title,
        category: created.category,
        status: "Draft",
        views: 0,
        lastUpdated: new Date(created.updated_at).toLocaleDateString(),
      },
      ...prev,
    ]);

    // reset + close
    setNewGuide({ title: "", category: "Safety", content: "" });
    setShowGuideDialog(false);
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
                <td className="table-title">{guide.title}</td>
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
            <input
              type="text"
              placeholder="Enter guide title"
              value={newGuide.title}
              onChange={(e) =>
                setNewGuide({ ...newGuide, title: e.target.value })
              }
            />
            {/* <input type="text" placeholder="Enter guide title" /> */}

            <label>Category</label>
            {/* <select>
              <option>Safety</option>
              <option>Protocol</option>
              <option>Preparedness</option>
            </select> */}
            <select
              value={newGuide.category}
              onChange={(e) =>
                setNewGuide({ ...newGuide, category: e.target.value })
              }
            >
              <option>Safety</option>
              <option>Protocol</option>
              <option>Preparedness</option>
            </select>


            <label>Content</label>
            <textarea
              rows={5}
              value={newGuide.content}
              onChange={(e) =>
                setNewGuide({ ...newGuide, content: e.target.value })
              }
            />


            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowGuideDialog(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={createGuide}>
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