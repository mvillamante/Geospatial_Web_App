import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Eye, Trash2, Send, ArchiveRestore, Phone } from 'lucide-react';
import { FiCheckCircle, FiSearch } from "react-icons/fi";
import { LuEllipsis } from "react-icons/lu";
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
  status: 'Published' | 'Draft' | 'Archived';
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments?: Attachment[];
}

interface ContactPhone {
  id?: number;
  type: "hotline" | "landline" | "mobile";
  label: string;
  number: string;
  is_24_7?: boolean;
}

interface QuickContact {
  id: number;
  name: string;
  description: string;
  email?: string;
  facebook_url?: string;
  website_url?: string;
  office_hours?: string;
  address?: string;
  map_url?: string;
  phones: ContactPhone[];
}

type cmsStatuses = 'All' | 'Published' | 'Draft' | 'Archived';
type cmsTypes = 'All' | 'advisory' | 'announcement' | 'guide';

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
    postType: "advisory",
    postBody: "",
  });
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notification, setNotification] = useState({ type: 'alert', message: '' });
  const [viewArchived, setViewArchived] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [guideToPublish, setGuideToPublish] = useState<Guide | null>(null);
  const [contact, setContact] = useState<QuickContact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);

    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deletedAttachments, setDeletedAttachments] = useState<number[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<Attachment[]>([]);
  const [tempEditImages, setTempEditImages] = useState<Attachment[]>([]);

  const cmsStatuses: Array<'Published' | 'Draft' | 'Archived'> = ['Published', 'Draft', 'Archived'];
  const cmsTypes: Array<'advisory' | 'announcement' | 'guide'> = ['advisory', 'announcement', 'guide'];
  const [statusFilter, setStatusFilter] = useState<cmsStatuses | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<cmsTypes | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);


  useEffect(() => {
    fetch("/api/cms/quick-contacts/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    })
      .then(res => res.json())
      .then(setContact);
  }, []);

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
          status: g.status === "published"? "Published" : g.status === "archived" ? "Archived": "Draft",
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

  const restoreGuide = async (postId: number) => {
    await fetch(`/api/cms/guides/${postId}/restore/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    // Remove restored guide from Archived list
    setGuides(prev => 
      prev.map(g => 
        g.postId === postId ? { ...g, status: "Draft" } : g
      )
    );
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

  const createGuide = async (publishImmediately = false) => {
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

  if (publishImmediately) {
    await fetch(`/api/cms/guides/${created.id}/publish/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
  }

  setGuides(prev => [
    {
      postId: created.id,
      postTitle: created.post_title,
      postType: created.post_type,
      postBody: created.post_body,
      status: publishImmediately ? "Published" : "Draft",
      isPinned: false,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      publishedAt: publishImmediately
        ? new Date().toISOString()
        : undefined,
      attachments: uploadedImage ? [uploadedImage] : [],
    },
    ...prev,
  ]);


  setNewGuide({ postTitle: "", postType: "advisory", postBody: "" });
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

    for (const attachmentId of deletedAttachments) {
      await fetch(`/api/cms/attachments/${attachmentId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
    }
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
              attachments: g.attachments?.filter(a => !deletedAttachments.includes(a.id)),
            }
          : g
      )
    );
    setDeletedAttachments([]);
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
  const filteredGuides = guides
    .filter(g => {
      const isArchived = g.status === "Archived";
      return viewArchived ? isArchived : !isArchived;
    })
    .filter(g => {
      if (statusFilter === 'All') return true;
      return g.status === statusFilter;
    })
    .filter(g => {
      if (typeFilter === 'All') return true;
      return g.postType === typeFilter;
    })
    .filter(g => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        g.postTitle.toLowerCase().includes(query) ||
        g.postType.toLowerCase().includes(query) ||
        g.postId.toString().includes(query)
      );
    });


  /* Tab */
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});

  const activeTabRef = (isArchived: boolean) => (el: HTMLButtonElement | null) => {
    tabRefs.current[isArchived ? "archived" : "active"] = el;
  };

  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const [indicatorOffset, setIndicatorOffset] = useState(0);

  useEffect(() => {
    const activeKey = viewArchived ? "archived" : "active";
    const el = tabRefs.current[activeKey];
    if (el) {
      const parentLeft = el.parentElement?.getBoundingClientRect().left || 0;
      const rect = el.getBoundingClientRect();
      setIndicatorWidth(rect.width);
      setIndicatorOffset(rect.left - parentLeft);
    }
  }, [viewArchived]);

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  return (
    <div className="cms-page">
      {/* Page Head */}
      <div className="page-head">
        <h1>Content Management System</h1>

        {/* Tab Actions */}
        <div className="page-actions">
          <div
            className="tab-indicator"
            ref={indicatorRef}
            style={{
              width: indicatorWidth,
              transform: `translateX(${indicatorOffset}px)`
            }}
          />
          <button
            type="button"
            className={`tab-btn ${!viewArchived ? "active" : ""}`}
            onClick={() => setViewArchived(false)}
            ref={activeTabRef(false)}
          >
            Active
          </button>

          <button
            type="button"
            className={`tab-btn ${viewArchived ? "active" : ""}`}
            onClick={() => setViewArchived(true)}
            ref={activeTabRef(true)}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Filters + Search + Create User */}
      <div className="filters">
        <div className="filters-left">
          {/* Filter Status */}
          <div className="select-wrapper">
            <FiCheckCircle className="select-icon" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'All')} className="status-select">
              <option value="All">All Status</option>
              {cmsStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Type */}
          <div className="select-wrapper">
            <FiCheckCircle className="select-icon" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as cmsTypes | 'All')}
              className="type-select"
            >
              <option value="All">All Types</option>
              {cmsTypes.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters-right">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              placeholder="Search title..."
            />
            {searchQuery.trim() && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear"
                type="button"
              >x</button>
            )}
          </div>
          
          {/* CMS ACTIONS */}
          <div className="cms-actions">
            <button
              className="btn secondary icon-btn"
              onClick={() => setShowContactModal(true)}
            >
              <Edit size={19} />
              <span className="btn-text">Manage Quick Contacts</span>
            </button>

            <button
              className="btn primary icon-btn"
              onClick={() => {
                setNewGuide({ postTitle: "", postType: "advisory", postBody: "" });
                setImagePreview(null);
                setShowCreateModal(true);
              }}
            >
              <Plus size={19} />
              <span className="btn-text">Create Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cms-table-wrapper">
        <table className="cms-table">
          <thead>
            <tr>
              <th className="center">Content ID</th>
              <th className="">Title</th>
              <th className="center">Type</th>
              <th className="center">Status</th>
              <th className="center">Created At</th>
              <th className="center">Updated At</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuides.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  Loading Content...
                </td>
              </tr>
            ) : (
              filteredGuides.map(guide => {

                return (
                  <tr key={guide.postId}>
                    <td className="table-id center">#G-0{guide.postId}</td>
                    <td className="">{guide.postTitle}</td>
                    <td className="center muted">{guide.postType.charAt(0).toUpperCase() + guide.postType.slice(1)}</td>

                    <td className="center">
                      <span className={`badge ${guide.status}`}>{guide.status}</span>
                    </td>
                    <td className="center">
                      {(() => {
                        const { date, time } = formatDateTime(guide.createdAt);
                        return (
                          <>
                            <div>{date}</div>
                            <div className="sub-time">{time}</div>
                          </>
                        );
                      })()}
                    </td>

                    <td className="center">
                      {(() => {
                        const { date, time } = formatDateTime(guide.updatedAt);
                        return (
                          <>
                            <div>{date}</div>
                            <div className="sub-time">{time}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="center">
                      <div className="row-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="kebab-btn"
                          aria-label="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === guide.postId  ? null : guide.postId ));
                          }}
                        ><LuEllipsis size={20} /></button>

                        {/* Dropdown */}
    {openMenuId === guide.postId && (
      <div className="dropdown-menu">
        {!viewArchived ? (
          <>
            <button
              className="dropdown-item"
              disabled={guide.status === "Published"}
              title={guide.status === "Published" ? "Unpublish to edit" : "Edit"}
              onClick={() => {
                if (guide.status === "Published") return;
                setEditingGuide({ ...guide });
                setOriginalAttachments(guide.attachments || []);
                setTempEditImages([]);
                setDeletedAttachments([]);
                setShowEditModal(true);
                setOpenMenuId(null);
              }}
            >
              <Edit size={16} /> Edit
            </button>

            <button
              className="dropdown-item"
              onClick={() => {
                setGuideToPublish(guide);
                setShowPublishModal(true);
                setOpenMenuId(null);
              }}
            >
              <Eye size={16} /> View
            </button>
          </>
        ) : (
          <button
            className="dropdown-item"
            onClick={() => {
              restoreGuide(guide.postId);
              setOpenMenuId(null);
            }}
          >
            <ArchiveRestore size={16} /> Restore
          </button>
        )}

        <button
          className="dropdown-item danger"
          onClick={() => {
            setGuideToDelete(guide);
            setShowDeleteModal(true);
            setOpenMenuId(null);
          }}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    )}

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
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
              <button className="btn-secondary" onClick={() => setShowNotificationDialog(false)}>
                Cancel
              </button>
              <button className="btn-primary">
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
              <option value="advisory">Advisory</option>
              <option value="announcement">Announcement</option>
              <option value="guide">Guide</option>
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
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;

                setNewGuide(prev => ({ ...prev, imageFile: file }));
                setImagePreview(URL.createObjectURL(file));
              }}
            />
            {imagePreview && (
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Preview" />

                <button
                  className="remove-image-btn"
                  onClick={() => {
                    setNewGuide(prev => ({ ...prev, imageFile: undefined }));
                    URL.revokeObjectURL(imagePreview);
                    setImagePreview(null);
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="modal-actions space-between">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setImagePreview(null);
                }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-tertiary"
                  onClick={() => createGuide(false)}
                >
                  Save Draft
                </button>

                <button
                  className="btn-primary"
                  onClick={() => createGuide(true)}
                >
                  Publish Content
                </button>
              </div>
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
              <option value="advisory">Advisory</option>
              <option value="announcement">Announcement</option>
              <option value="guide">Guide</option>
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

                setTempEditImages(prev => [...prev, uploaded]);
              }}
            />

            {(editingGuide.attachments?.length || tempEditImages.length) > 0 && (
              <div className="attachment-preview">
                {[...(editingGuide.attachments || []), ...tempEditImages].map(img => (
                  <div key={img.id} className="attachment-wrapper">
                    <img src={img.file_url} alt="attachment" style={{ width: "120px", borderRadius: "8px", marginRight: "8px", marginTop: "8px" }} />

                    <button
                      className="remove-image-btn"
                      onClick={() => {
                        // Remove from tempEditImages first
                        setTempEditImages(prev => prev.filter(a => a.id !== img.id));

                        // If it's from existing attachments, mark for deletion
                        if (editingGuide.attachments?.some(a => a.id === img.id)) {
                          setDeletedAttachments(prev => [...prev, img.id]);
                          setEditingGuide(prev =>
                            prev
                              ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== img.id) }
                              : prev
                          );
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() =>{
                  setEditingGuide(prev =>
                    prev ? { ...prev, attachments: originalAttachments } : null
                  );
                  setTempEditImages([]);
                  setDeletedAttachments([]);
                  setShowEditModal(false);}
                }>
                Cancel
              </button>
              <button className="btn-primary" onClick={updateGuide}>
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
              {viewArchived
                ? "This guide is already archived. You may permanently delete it."
                : "What would you like to do with "}
              <strong>"{guideToDelete.postTitle}"</strong>?
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setGuideToDelete(null);
                }}
              >
                Cancel
              </button>

            {!viewArchived && (
              <button
                className="btn-secondary"
                onClick={() => {
                  archiveGuide(guideToDelete.postId);
                  setShowDeleteModal(false);
                  setGuideToDelete(null);
                }}
              >
                Archive
              </button>
            )}

              <button
                className="btn-secondary danger"
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

      {/* Publish Confirmation Modal */}
      {showPublishModal && guideToPublish && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {guideToPublish.status === "Published"
                ? "Unpublish Content"
                : "Publish Content"}
            </h2>

            <p>
              Are you sure you want to{" "}
              <strong>
                {guideToPublish.status === "Published"
                  ? "unpublish"
                  : "publish"}
              </strong>{" "}
              <strong>"{guideToPublish.postTitle}"</strong>?
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowPublishModal(false);
                  setGuideToPublish(null);
                }}
              >
                Cancel
              </button>

              <button
                className="btn-secondary danger"
                onClick={async () => {
                  await togglePublish(guideToPublish.postId);
                  setShowPublishModal(false);
                  setGuideToPublish(null);
                }}
              >
                {guideToPublish.status === "Published"
                  ? "Unpublish"
                  : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Contact Modal */}
      {showContactModal && contact && (
        <div className="modal-overlay">
          <div className="modal large">
            <h2>Edit Quick Contact</h2>
            <div className="contact-grid">
              <div className="contact-section">
                <h3>Basic Information</h3>
                  <label>Name</label>
                  <input
                    value={contact.name}
                    onChange={e => setContact({ ...contact, name: e.target.value })}
                  />

                  {/* <label>Description</label>
                  <input
                    value={contact.description}
                    onChange={e => setContact({ ...contact, description: e.target.value })}
                  /> */}

                  <label>Email</label>
                  <input
                    value={contact.email || ""}
                    onChange={e => setContact({ ...contact, email: e.target.value })}
                  />
              </div>
              <div className="contact-section">
                <h3>Online Links</h3>
                  <label>Facebook URL</label>
                  <input
                    value={contact.facebook_url || ""}
                    onChange={e => setContact({ ...contact, facebook_url: e.target.value })}
                  />

                  <label>Website URL</label>
                  <input
                    value={contact.website_url || ""}
                    onChange={e => setContact({ ...contact, website_url: e.target.value })}
                  />

                  <label>Map URL</label>
                  <input
                    value={contact.map_url || ""}
                    onChange={e => setContact({ ...contact, map_url: e.target.value })}
                  />
              </div>
              <div className="contact-section">
                <h3>Location and Time</h3>
                  <label>Office Hours</label>
                  <input
                    value={contact.office_hours || ""}
                    onChange={e => setContact({ ...contact, office_hours: e.target.value })}
                  />

                  <label>Address</label>
                  <input
                    value={contact.address || ""}
                    onChange={e => setContact({ ...contact, address: e.target.value })}
                  />
              </div>

            </div>

            <hr />
            <h3>Contact Numbers</h3>

            {contact.phones.map((p, idx) => (
              <div className="phone-card">
                <div key={p.id || idx} className="phone-row-top">
                  <select
                    value={p.type}
                    onChange={e => {
                      const updated = [...contact.phones];
                      updated[idx].type = e.target.value as "hotline" | "landline" | "mobile";
                      setContact({ ...contact, phones: updated });
                    }}
                  >
                    <option value="hotline">Hotline</option>
                    <option value="landline">Landline</option>
                    <option value="mobile">Mobile</option>
                  </select>

                  <input
                    placeholder="Label"
                    value={p.label}
                    onChange={e => {
                      const updated = [...contact.phones];
                      updated[idx].label = e.target.value;
                      setContact({ ...contact, phones: updated });
                    }}
                  />

                  <input
                    placeholder="Number"
                    value={p.number}
                    onChange={e => {
                      const updated = [...contact.phones];
                      updated[idx].number = e.target.value;
                      setContact({ ...contact, phones: updated });
                    }}
                  />

                  <button
                    className="icon-btn danger"
                    onClick={() => {
                      setContact({
                        ...contact,
                        phones: contact.phones.filter((_, i) => i !== idx),
                      });
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            <button
              className="btn-secondary add-phone-btn"
              onClick={() =>
                setContact({
                  ...contact,
                  phones: [...contact.phones, { type: "hotline", label: "", number: "" }],
                })
              }
            >
              <Plus size={14} /> Add Phone
            </button>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowContactModal(false)}>
                Cancel
              </button>

              <button
                className="btn-primary"
                onClick={async () => {
                  const res = await fetch(`/api/cms/quick-contacts/${contact.id}/`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    },
                    body: JSON.stringify(contact),
                  });

                  if (!res.ok) {
                    alert("Failed to save contact");
                    return;
                  }

                  const updatedContact = await res.json();
                  setContact(updatedContact);
                  setShowContactModal(false);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CmsPage;
