import { useEffect, useState } from 'react';
import { Plus, Edit, Eye, Trash2, Send } from 'lucide-react';
import './CmsPage.css';
import RichTextEditor from './TextEditor/RichTextEditor';

interface Attachment {
  id: number;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface Guide {
  postId: number;
  postTitle: string;
  postType: string;
  postBody?: string;
  status: 'Published' | 'Draft';
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments?: Attachment[];
}


const CmsPage: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [newGuide, setNewGuide] = useState<{
    postTitle: string;
    postType: string;
    postBody: string;
    imageFile?: File;
  }>({
    postTitle: "",
    postType: "safety",
    postBody: "",
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
          postId: g.id,
          postTitle: g.post_title,
          postType: g.post_type,
          postBody: g.post_body,
          status: g.status === "published" ? "Published" : "Draft",
          isPinned: g.is_pinned,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
          publishedAt: g.published_at,
          attachments: g.attachments || [],
        }));

        setGuides(mappedGuide);
      });
  }, []);

  const togglePublish = async (postId: number) => {
    await fetch(`/api/cms/guides/${postId}/publish/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    setGuides(g =>
      g.map(item =>
        item.postId === postId
          ? { ...item, status: item.status === "Published" ? "Draft" : "Published" }
          : item
      )
    );
  };

  const archiveGuide = async (postId: number) => {
    await fetch(`/api/cms/guides/${postId}/archive/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    setGuides(g => g.filter(item => item.postId !== postId));
  };

  const permanentDeleteGuide = async (postId: number) => {
    await fetch(`/api/cms/guides/${postId}/permanent-delete/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    setGuides(g => g.filter(item => item.postId !== postId));
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

  let uploadedImage = null;
  if (newGuide.imageFile) {
    uploadedImage = await uploadImage(created.id, newGuide.imageFile);
  }

  setGuides(prev => [
    {
      postId: created.id,
      postTitle: created.post_title,
      postType: created.post_type,
      postBody: created.post_body,
      status: "Draft",
      isPinned: false,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      publishedAt: created.published_at,
      attachments: uploadedImage ? [uploadedImage] : [],
    },
    ...prev,
  ]);

  setNewGuide({ postTitle: "", postType: "safety", postBody: "" });
  setShowCreateModal(false);
};


  const updateGuide = async () => {
    if (!editingGuide) return;

    const res = await fetch(`/api/cms/guides/${editingGuide.postId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({
        postTitle: editingGuide.postTitle,
        postType: editingGuide.postType,
        postBody: editingGuide.postBody,
      }),
    });

    if (!res.ok) {
      alert("Failed to update guide");
      return;
    }

    const updated = await res.json();

    setGuides(prev =>
      prev.map(g =>
        g.postId === updated.id
          ? {
              ...g,
              postTitle: updated.post_title,
              postType: updated.post_type,
              postBody: updated.post_body,
              updatedAt: updated.updated_at,
              publishedAt: updated.published_at,
            }
          : g
      )
    );

    setEditingGuide(null);
    setShowEditModal(false);
  };

  const uploadImage = async (guideId: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(
      `/api/cms/guides/${guideId}/attachments/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      alert("Image upload failed");
      return null;
    }

    return await res.json();
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
              setNewGuide({ postTitle: "", postType: "safety", postBody: "" });
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
            <th>Type</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Updated At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {guides.map(guide => (
            <tr key={guide.postId}>
              <td>{guide.postTitle}</td>
              <td>{guide.postType.charAt(0).toUpperCase() + guide.postType.slice(1)}</td>

              <td>
                <span className={`badge ${guide.status}`}>{guide.status}</span>
              </td>
              <td>{new Date(guide.createdAt).toLocaleDateString()}</td>
              <td>{new Date(guide.updatedAt).toLocaleDateString()}</td>
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
                  <button className="icon-btn" onClick={() => togglePublish(guide.postId)}>
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
                value={newGuide.postTitle}
                onChange={e => setNewGuide({ ...newGuide, postTitle: e.target.value })}
              />

              <label>Type</label>
              <select
                value={newGuide.postType}
                onChange={e => setNewGuide({ ...newGuide, postType: e.target.value })}
              >
                <option value="safety">Safety</option>
                <option value="protocol">Protocol</option>
                <option value="preparedness">Preparedness</option>
              </select>

              <label>Body</label>
              <RichTextEditor
                initialHtml={newGuide.postBody}
                onChange={(html) => setNewGuide({ ...newGuide, postBody: html })}
              />
              <label>Attach Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={async e => {
                  if (!e.target.files?.[0]) return;

                  // temporarily store the file in state for later upload
                  setNewGuide(prev => ({ ...prev, imageFile: e.target.files![0] }));
                }}
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
                value={editingGuide.postTitle}
                onChange={e =>
                  setEditingGuide({ ...editingGuide, postTitle: e.target.value })
                }
              />

              <label>Type</label>
              <select
                value={editingGuide.postType}
                onChange={e =>
                  setEditingGuide({ ...editingGuide, postType: e.target.value })
                }
              >
                <option value="safety">Safety</option>
                <option value="protocol">Protocol</option>
                <option value="preparedness">Preparedness</option>
              </select>

              <label>Body</label>
              <RichTextEditor
                initialHtml={editingGuide.postBody || ""}
                onChange={(html) => setEditingGuide({ ...editingGuide, postBody: html })}
              />
              <label>Attach Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={async e => {
                  if (!e.target.files?.[0] || !editingGuide) return;

                  const uploaded = await uploadImage(editingGuide.postId, e.target.files[0]);
                  if (!uploaded) return;

                  setEditingGuide(prev =>
                    prev
                      ? { ...prev, attachments: [...(prev.attachments || []), uploaded] }
                      : prev
                  );

                  setGuides(prev =>
                    prev.map(g =>
                      g.postId === editingGuide.postId
                        ? { ...g, attachments: [...(g.attachments || []), uploaded] }
                        : g
                    )
                  );
                }}
              />

              {editingGuide.attachments && editingGuide.attachments.length > 0 && (
                <div className="attachment-preview">
                  {editingGuide.attachments.map(img => (
                    <img
                      key={img.id}
                      src={img.file_url}
                      alt="attachment"
                      style={{
                        width: "120px",
                        borderRadius: "8px",
                        marginRight: "8px",
                        marginTop: "8px",
                      }}
                    />
                  ))}
                </div>
              )}


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
                <strong> "{guideToDelete.postTitle}"</strong>?
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
                    archiveGuide(guideToDelete.postId);
                    setShowDeleteModal(false);
                    setGuideToDelete(null);
                  }}
                >
                  Archive
                </button>

                <button
                  className="btn danger"
                  onClick={() => {
                    permanentDeleteGuide(guideToDelete.postId);
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
