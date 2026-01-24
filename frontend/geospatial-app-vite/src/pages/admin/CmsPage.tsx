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
  content?: string; 
}


const CmsPage: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [newGuide, setNewGuide] = useState({
    title: "",
    category: "Safety",
    content: "",
  });
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
        const mappedGuide = data.map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          content: g.content,
          status: g.status === "published" ? "Published" : "Draft",
          views: g.views,
          lastUpdated: new Date(g.updated_at).toLocaleDateString(),
        }));

        setGuides(mappedGuide);
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

  const archiveGuide = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/cms/guides/${id}/archive/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    setGuides(g => g.filter(item => item.id !== id));
  };

  const permanentDeleteGuide = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/cms/guides/${id}/permanent-delete/`, {
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
      body: JSON.stringify(newGuide),
    });

    if (!res.ok) {
      alert("Failed to create guide");
      return;
    }

    const created = await res.json();

    setGuides(prev => [
      {
        id: created.id,
        title: created.title,
        category: created.category,
        content: created.content,
        status: "Draft",
        views: 0,
        lastUpdated: new Date(created.updated_at).toLocaleDateString(),
      },
      ...prev,
    ]);

    setNewGuide({ title: "", category: "Safety", content: "" });
    setShowCreateModal(false);
  };

  const updateGuide = async () => {
    if (!editingGuide) return;

    const res = await fetch(`/api/cms/guides/${editingGuide.id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({
        title: editingGuide.title,
        category: editingGuide.category,
        content: editingGuide.content,
      }),
    });

    if (!res.ok) {
      alert("Failed to update guide");
      return;
    }

    const updated = await res.json();

    setGuides(prev =>
      prev.map(g =>
        g.id === updated.id
          ? {
              ...g,
              title: updated.title,
              category: updated.category,
              content: updated.content,
              lastUpdated: new Date(updated.updated_at).toLocaleDateString(),
            }
          : g
      )
    );

    setEditingGuide(null);
    setShowEditModal(false);
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
          <button
            className="btn primary"
            onClick={() => {
              setNewGuide({ title: "", category: "Safety", content: "" });
              setShowCreateModal(true);
            }}
          >
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
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditingGuide({ ...guide });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => togglePublish(guide.id)}>
                      <Eye size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => {
                        setGuideToDelete(guide);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Guide</h2>

            <label>Title</label>
            <input
              value={newGuide.title}
              onChange={e => setNewGuide({ ...newGuide, title: e.target.value })}
            />

            <label>Category</label>
            <select
              value={newGuide.category}
              onChange={e => setNewGuide({ ...newGuide, category: e.target.value })}
            >
              <option>Safety</option>
              <option>Protocol</option>
              <option>Preparedness</option>
            </select>

            <label>Content</label>
            <textarea
              rows={5}
              value={newGuide.content}
              onChange={e => setNewGuide({ ...newGuide, content: e.target.value })}
            />

            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={createGuide}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingGuide && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Guide</h2>

            <label>Title</label>
            <input
              value={editingGuide.title}
              onChange={e =>
                setEditingGuide({ ...editingGuide, title: e.target.value })
              }
            />

            <label>Category</label>
            <select
              value={editingGuide.category}
              onChange={e =>
                setEditingGuide({ ...editingGuide, category: e.target.value })
              }
            >
              <option>Safety</option>
              <option>Protocol</option>
              <option>Preparedness</option>
            </select>

            <label>Content</label>
            <textarea
              rows={5}
              value={editingGuide.content || ""}
              onChange={e =>
                setEditingGuide({ ...editingGuide, content: e.target.value })
              }
            />

            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={updateGuide}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Modal */}
      {showDeleteModal && guideToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Delete Guide</h2>

            <p>
              What would you like to do with
              <strong> "{guideToDelete.title}"</strong>?
            </p>

            <div className="modal-actions">
              <button
                className="btn secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setGuideToDelete(null);
                }}
              >
                Cancel
              </button>

              <button
                className="btn secondary"
                onClick={() => {
                  archiveGuide(guideToDelete.id);
                  setShowDeleteModal(false);
                  setGuideToDelete(null);
                }}
              >
                Archive
              </button>

              <button
                className="btn danger"
                onClick={() => {
                  permanentDeleteGuide(guideToDelete.id);
                  setShowDeleteModal(false);
                  setGuideToDelete(null);
                }}
              >
                Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}


    </div>

  );
};

export default CmsPage;