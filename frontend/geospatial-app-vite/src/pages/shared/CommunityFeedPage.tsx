import { useMemo, useState, useEffect } from "react";
import { FaFacebook, FaEnvelope, FaSyncAlt } from "react-icons/fa";

import {
    Pin,
    Search,
    AlertTriangle,
    Megaphone,
    BookOpen,
    Image as ImageIcon,
    MapPin,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import "./CommunityFeedPage.css";

const API_URL = import.meta.env.VITE_API_URL;

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

// function initials(name: string) {
//     const parts = name.trim().split(/\s+/);
//     const first = parts[0]?.[0] ?? "?";
//     const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
//     return (first + last).toUpperCase();
// }


export default function CommunityFeedPage() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | PostType>("all");
    const [selected, setSelected] = useState<FeedPost | null>(null);
    const [contact, setContact] = useState<QuickContact | null>(null);
    const location = useLocation() as any;

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const openId = location.state?.openPostId;
        if (!openId || posts.length === 0) return;

        const found = posts.find(p => p.id === openId)
        if (found) setSelected(found);

    }, [location.state, posts])

    useEffect(() => {
        const fetchContact = async () => {
            try {
                const token = localStorage.getItem("access_token");

                const headers: HeadersInit = token
                    ? { Authorization: `Bearer ${token}` }
                    : {};

                const res = await fetch(`${API_URL}/api/cms/quick-contacts/`, {
                    headers,
                });

                if (!res.ok) throw new Error("Failed to fetch contacts");

                const data = await res.json();
                setContact(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchContact();
    }, []);

    const fetchFeed = async () => {
        try {
            if (refreshing) return;

            setRefreshing(true);
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_URL}/api/community-feed/`);

            if (!res.ok) throw new Error("Failed to fetch feed");

            const data = await res.json();

            setPosts(data);

        } catch (err: any) {
            setError(err.message ?? "Something went wrong");

        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    useEffect(() => {
        const container = document.querySelector(".main-content");
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollTop > 200) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        container.addEventListener("scroll", handleScroll);

        return () => container.removeEventListener("scroll", handleScroll);
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
                        {/* <div className="feed-title">
                            <h1>Community Feed</h1>
                            <p className="feed-header-desc">Latest advisories, announcements, and guides</p>
                        </div> */}

                        <div className="feed-controls">
                            <label className="search">
                                <Search size={16} />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search updates..."
                                />
                            </label>

                            <div className="filter-chips">
                                <button
                                    className={`filter-pill ${filter === "all" ? "active" : ""}`}
                                    onClick={() => setFilter("all")}
                                >
                                    All
                                </button>

                                <button
                                    className={`filter-pill advisory ${filter === "advisory" ? "active" : ""}`}
                                    onClick={() => setFilter("advisory")}
                                >
                                    <AlertTriangle size={14} />
                                    Advisory
                                </button>

                                <button
                                    className={`filter-pill announcement ${filter === "announcement" ? "active" : ""}`}
                                    onClick={() => setFilter("announcement")}
                                >
                                    <Megaphone size={14} />
                                    Announcement
                                </button>

                                <button
                                    className={`filter-pill guide ${filter === "guide" ? "active" : ""}`}
                                    onClick={() => setFilter("guide")}
                                >
                                    <BookOpen size={14} />
                                    Guide
                                </button>
                            </div>
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
                        {/* Refresh Button Row */}
                        <div className="feed-refresh-row">
                            <button
                                className="refresh-btn"
                                onClick={fetchFeed}
                                disabled={refreshing}
                            >
                                <FaSyncAlt className={refreshing ? "spin" : ""} />
                                <span>{refreshing ? "Refreshing..." : "Refresh Feed"}</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="empty-state">Loading updates…</div>
                        ) : error ? (
                            <div className="empty-state error">{error}</div>
                        ) : normal.length === 0 && pinned.length === 0 ? (
                            <div className="empty-state">No updates yet.</div>
                        ) : (
                            <>
                                {normal.map((p) => <PostRow key={p.id} post={p} onOpen={() => setSelected(p)} />)}
                            </>
                        )}
                    </section>

                    {showScrollTop && (
                        <button
                            className="scroll-top-btn"
                            onClick={() => {
                                const container = document.querySelector(".main-content");
                                container?.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                        >
                            ↑
                        </button>
                    )}
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
                                        <a className="contact-btn facebook" href={contact.facebook_url} target="_blank" rel="noreferrer">
                                            <FaFacebook className="btn-icon" />
                                            <span>Facebook Page</span>
                                        </a>
                                    )}
                                    {contact.email && (
                                        <a className="contact-btn email" href={`mailto:${contact.email}`}>
                                            <FaEnvelope className="btn-icon" />
                                            <span>Email</span>
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


