import React, { useMemo, useState, useEffect } from "react";
import {
    Pin,
    Search,
    SlidersHorizontal,
    AlertTriangle,
    Megaphone,
    BookOpen,
    Image as ImageIcon,
    MapPin,
} from "lucide-react";
import "./CommunityFeedPage.css";

type PostType = "advisory" | "announcement" | "guide";

type FeedPost = {
    id: number;
    type: PostType;
    title: string;
    body: string;
    author: string;
    created_at: string;
    pinned?: boolean;
    area?: string;
    photo_url?: string | null;
    attachments?: string[];
};

type QuickContact = {
  name: string;
  description: string;
  email?: string;
  facebook_url?: string;
  website_url?: string;
  office_hours?: string;
  address?: string;
  map_url?: string;
  phones: {
    type: "hotline" | "landline" | "mobile";
    label: string;
    number: string;
  }[];
};


const labelForType = (type: PostType) =>
    type === "advisory" ? "Advisory" : type === "announcement" ? "Announcement" : "Guide";

const iconForType = (type: PostType) => {
    switch (type) {
        case "advisory":
            return <AlertTriangle size={16} />;
        case "announcement":
            return <Megaphone size={16} />;
        case "guide":
            return <BookOpen size={16} />;
    }
};

const timeAgo = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
};

function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "?";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

export default function CommunityFeedPage() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | PostType>("all");
    const [selected, setSelected] = useState<FeedPost | null>(null);
    const [contact, setContact] = useState<QuickContact | null>(null);

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
        const fetchFeed = async () => {
            try {
                setLoading(true);
                const res = await fetch("http://localhost:8000/api/community-feed/");
                if (!res.ok) throw new Error("Failed to fetch feed");

                const data = await res.json();
                setPosts(data);
            } catch (err: any) {
                setError(err.message ?? "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, []);


    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return posts
            .filter((p) => (filter === "all" ? true : p.type === filter))
            .filter((p) => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }, [posts, query, filter]);

    const pinned = filtered.filter(p => p.pinned).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const normal = filtered.filter(p => !p.pinned).sort((a, b) => b.created_at.localeCompare(a.created_at));


    return (
        <div className="feed-page">
            <div className="feed-layout">
                {/* Main */}
                <main className="feed-main">
                    <header className="feed-topbar">
                        <div className="feed-title">
                            <h1>Community Feed</h1>
                            <p className="feed-header-desc">Latest advisories, announcements, and guides</p>
                        </div>

                        <div className="feed-controls">
                            <label className="search">
                                <Search size={16} />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search updates..."
                                />
                            </label>

                            <label className="filter">
                                <SlidersHorizontal size={16} />
                                <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                                    <option value="all">All</option>
                                    <option value="advisory">Advisories</option>
                                    <option value="announcement">Announcements</option>
                                    <option value="guide">Guides</option>
                                </select>
                            </label>
                        </div>
                    </header>

                    {pinned.length > 0 && (
                        <section className="pinned-block">
                            <div className="section-title">
                                <Pin size={16} /> Pinned
                            </div>
                            <div className="feed-list">
                                {pinned.map((p) => (
                                    <PostRow key={p.id} post={p} onOpen={() => setSelected(p)} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="feed-list">
                        {loading ? (
                            <div className="empty-state">Loading updates…</div>
                        ) : error ? (
                            <div className="empty-state error">{error}</div>
                        ) : normal.length === 0 && pinned.length === 0 ? (
                            <div className="empty-state">No updates yet.</div>
                        ) : (
                            normal.map((p) => <PostRow key={p.id} post={p} onOpen={() => setSelected(p)} />)
                        )}
                    </section>

                </main>

                <aside className="feed-rail">
                    <div className="rail-card">
                        <div className="rail-title">Quick Contacts</div>

                        {contact && (
                        <div className="contact-card">
                            <div className="contact-top">
                            <div className="contact-name">{contact.name}</div>
                            <div className="contact-sub">{contact.description}</div>
                            </div>

                            <div className="contact-actions">
                            {contact.facebook_url && (
                                <a className="contact-btn" href={contact.facebook_url} target="_blank" rel="noreferrer">
                                Facebook Page
                                </a>
                            )}
                            {contact.email && (
                                <a className="contact-btn" href={`mailto:${contact.email}`}>
                                Email
                                </a>
                            )}
                            </div>

                            <div className="contact-meta">
                            {contact.phones.map((p, i) => (
                                <div className="contact-line" key={i}>
                                <span className="k">{p.label}:</span>
                                <span className="v">{p.number}</span>
                                </div>
                            ))}

                            {contact.office_hours && (
                                <div className="contact-line">
                                <span className="k">Office Hours:</span>
                                <span className="v">{contact.office_hours}</span>
                                </div>
                            )}

                            {contact.address && (
                                <div className="contact-line">
                                <span className="k">Address:</span>
                                <span className="v">{contact.address}</span>
                                </div>
                            )}

                            {contact.map_url && (
                                <a className="contact-link" href={contact.map_url} target="_blank" rel="noreferrer">
                                View on map →
                                </a>
                            )}
                            </div>
                        </div>
                        )}

                    </div>

                </aside>

            </div>

            {selected && (
                <div className="modal-backdrop" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-top">
                            <div className="type-badge">
                                {iconForType(selected.type)}
                                <span>{labelForType(selected.type)}</span>
                            </div>

                            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="modal-header">
                            <div className="avatar avatar-lg" aria-hidden="true">
                                {"CC"}
                            </div>

                            <div className="modal-header-text">
                                <div className="modal-title">{selected.title}</div>

                                <div className="modal-meta">
                                    <span className="meta-strong">Cabuyao CDRRMO</span>
                                    <span className="dot">•</span>
                                    <span>{timeAgo(selected.created_at)}</span>
                                    {selected.area ? (
                                        <>
                                            <span className="dot">•</span>
                                            <span className="area">
                                                <MapPin size={12} />
                                                {selected.area}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <p className="modal-body"
                            dangerouslySetInnerHTML={{ __html: selected.body }}
                        />


                        {selected.attachments?.map((url, i) => (
                            <div className="modal-photo-wrap" key={i}>
                                <img className="modal-photo" src={url} alt={`Attachment ${i + 1}`} />
                            </div>
                        ))}

                    </div>
                </div>
            )}
        </div>
    );
}

function PostRow({ post, onOpen }: { post: FeedPost; onOpen: () => void }) {
    return (
        <button className="post-row" onClick={onOpen} type="button">
            <div className="avatar" aria-hidden="true">
                {"CC"}
            </div>

            <div className="post-content">
                <div className="post-head">
                    <div className="post-author">
                        <span className="meta-strong">Cabuyao CDRRMO</span>
                        <span className="dot">•</span>
                        <span className="muted">{timeAgo(post.created_at)}</span>
                        {post.area ? (
                            <>
                                <span className="dot">•</span>
                                <span className="area">
                                    <MapPin size={12} />
                                    {post.area}
                                </span>
                            </>
                        ) : null}
                    </div>

                    <div className="post-badges">
                        <span className={`pill pill-${post.type}`}>
                            {iconForType(post.type)}
                            {labelForType(post.type)}
                        </span>

                        {post.photo_url ? (
                            <span className="pill pill-soft" title="Has photo">
                                <ImageIcon size={14} />
                                Photo
                            </span>
                        ) : null}

                        {post.pinned ? (
                            <span className="pill pill-soft">
                                <Pin size={14} />
                                Pinned
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="post-title">{post.title}</div>
                <div className="post-preview"
                    dangerouslySetInnerHTML={{ __html: post.body }}
                />


                {post.attachments?.map((url, i) => (
                    <div className="post-photo-wrap" key={i}>
                        <img className="post-photo" src={url} alt={`Post attachment ${i + 1}`} />
                    </div>
                ))}

            </div>
        </button>
    );
}


