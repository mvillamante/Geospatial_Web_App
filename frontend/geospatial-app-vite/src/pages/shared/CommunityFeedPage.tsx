import React, { useMemo, useState } from "react";
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
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | PostType>("all");
    const [selected, setSelected] = useState<FeedPost | null>(null);

    const posts: FeedPost[] = useMemo(
        () => [
            {
                id: 1,
                type: "advisory",
                title: "Flood Advisory: Yellow Warning Level",
                body: "Heavy rainfall expected in the next 6 hours. Prepare go-bags and monitor updates. Avoid low-lying areas.",
                author: "CDRRMO",
                created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
                pinned: true,
                area: "Brgy. San Isidro",
                photo_url:
                    "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=70",
            },
            {
                id: 2,
                type: "announcement",
                title: "Road Clearing: Main Highway (9AM–12NN)",
                body: "Road clearing operation will be conducted. Expect delays. Please use alternate routes. Keep lanes clear for emergency vehicles.",
                author: "CDRRMO",
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                area: "Brgy. Banay-Banay",
                photo_url: null,
            },
        ],
        []
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return posts
            .filter((p) => (filter === "all" ? true : p.type === filter))
            .filter((p) => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }, [posts, query, filter]);

    const pinned = filtered.filter((p) => p.pinned);
    const normal = filtered.filter((p) => !p.pinned);

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
                        {normal.length === 0 && pinned.length === 0 ? (
                            <div className="empty-state">No updates yet.</div>
                        ) : (
                            normal.map((p) => <PostRow key={p.id} post={p} onOpen={() => setSelected(p)} />)
                        )}
                    </section>
                </main>

                <aside className="feed-rail">
                    <div className="rail-card">
                        <div className="rail-title">Quick Contacts</div>

                        <div className="contact-card">
                            <div className="contact-top">
                                <div className="contact-name">Cabuyao CDRRMO</div>
                                <div className="contact-sub">Official channels</div>
                            </div>

                            <div className="contact-actions">
                                <a
                                    className="contact-btn"
                                    href="https://facebook.com/YOUR_LGU_PAGE"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Facebook Page
                                </a>

                                <a className="contact-btn" href="mailto:info@lgu.gov.ph">
                                    Email
                                </a>
                            </div>

                            <div className="contact-meta">
                                <div className="contact-line">
                                    <span className="k">Hotline:</span>
                                    <span className="v">+63 9XX XXX XXXX</span>
                                </div>
                                <div className="contact-line">
                                    <span className="k">Landline:</span>
                                    <span className="v">(0XX) XXX-XXXX</span>
                                </div>
                                <div className="contact-line">
                                    <span className="k">Office Hours:</span>
                                    <span className="v">Mon–Fri, 8:00 AM–5:00 PM</span>
                                </div>
                                <div className="contact-line">
                                    <span className="k">Address:</span>
                                    <span className="v">City Hall, Main St.</span>
                                </div>

                                <a
                                    className="contact-link"
                                    href="https://maps.google.com/?q=City+Hall"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View on map →
                                </a>
                            </div>
                        </div>
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
                                {initials(selected.author)}
                            </div>

                            <div className="modal-header-text">
                                <div className="modal-title">{selected.title}</div>

                                <div className="modal-meta">
                                    <span className="meta-strong">{selected.author}</span>
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

                        <p className="modal-body">{selected.body}</p>

                        {selected.photo_url ? (
                            <div className="modal-photo-wrap">
                                <img className="modal-photo" src={selected.photo_url} alt="Post attachment" />
                            </div>
                        ) : null}
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
                {initials(post.author)}
            </div>

            <div className="post-content">
                <div className="post-head">
                    <div className="post-author">
                        <span className="meta-strong">{post.author}</span>
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
                <div className="post-preview">{post.body}</div>

                {post.photo_url ? (
                    <div className="post-photo-wrap">
                        <img className="post-photo" src={post.photo_url} alt="Post attachment preview" />
                    </div>
                ) : null}
            </div>
        </button>
    );
}


