import React, { useMemo, useState } from "react";
import { Pin, Search, SlidersHorizontal, AlertTriangle, Megaphone, BookOpen, Image as ImageIcon } from "lucide-react";
import { set } from "date-fns";


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
                body: "Heavy rainfall expected in the next 6 hours. Prepare go-bags and monitor updates. Avoid riverbanks and low-lying areas.",
                author: "MDRRMO",
                created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
                pinned: true,
                area: "Citywide",
                photo_url:
                    "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=70",
            },
            {
                id: 2,
                type: "announcement",
                title: "Road Clearing: Main Highway (9AM–12NN)",
                body: "Road clearing operation will be conducted. Expect delays. Please use alternate routes. Keep lanes clear for emergency vehicles.",
                author: "LGU Traffic Office",
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                area: "Downtown",
                photo_url: null,
            },
            {
                id: 3,
                type: "guide",
                title: "How to Report an Incident (Quick Steps)",
                body: "Open Report & Map, allow location access, select category, add description, then upload a photo if available. Submit and wait for verification.",
                author: "LGU Admin",
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                area: "Citywide",
                photo_url:
                    "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=70",
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
            <div className="feed-header">
                <div className="feed-title-block">
                    <h1>Community Feed</h1>
                    <p className="subtitle">Latest advisories, announcements, and guides</p>
                </div>

                <div className="feed-controls">
                    <div className="search">
                        <Search size={16} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search updates..."
                        />
                    </div>

                    <div className="filter">
                        <SlidersHorizontal size={16} />
                        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                            <option value="all">All</option>
                            <option value="advisory">Advisories</option>
                            <option value="announcement">Announcements</option>
                            <option value="guide">Guides</option>
                        </select>
                    </div>
                </div>
            </div>

            {pinned.length > 0 && (
                <div className="pinned-block">
                    <div className="section-title">
                        <Pin size={16} /> Pinned
                    </div>
                    <div className="feed-list">
                        {pinned.map((p) => (
                            <PostCard key={p.id} post={p} onOpen={() => setSelected(p)} />
                        ))}
                    </div>
                </div>
            )}

            <div className="feed-list">
                {normal.length === 0 && pinned.length === 0 ? (
                    <div className="empty-state">No updates yet.</div>
                ) : (
                    normal.map((p) => <PostCard key={p.id} post={p} onOpen={() => setSelected(p)} />)
                )}
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

                        <h2 className="modal-title">{selected.title}</h2>

                        <div className="modal-meta">
                            <span className="meta-strong">{selected.author}</span>
                            <span className="dot">•</span>
                            <span>{timeAgo(selected.created_at)}</span>
                            {selected.area ? (
                                <>
                                    <span className="dot">•</span>
                                    <span>{selected.area}</span>
                                </>
                            ) : null}
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


function PostCard({ post, onOpen }: { post: FeedPost; onOpen: () => void }) {
    return (
        <button className="post-card" onClick={onOpen} type="button">
            <div className="post-top">
                <div className="type-badge">
                    {iconForType(post.type)}
                    <span>{labelForType(post.type)}</span>
                </div>

                <div className="post-top-right">
                    {post.photo_url ? (
                        <span className="has-photo" title="Has photo">
                            <ImageIcon size={14} />
                            <span className="has-photo-text">Photo</span>
                        </span>
                    ) : null}

                    {post.pinned ? (
                        <span className="pinned-tag">
                            <Pin size={14} />
                            <span>Pinned</span>
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="post-title">{post.title}</div>

            <div className="post-meta">
                <span className="meta-strong">{post.author}</span>
                <span className="dot">•</span>
                <span>{timeAgo(post.created_at)}</span>
                {post.area ? (
                    <>
                        <span className="dot">•</span>
                        <span className="area">{post.area}</span>
                    </>
                ) : null}
            </div>

            <div className="post-preview">{post.body}</div>

            {post.photo_url ? (
                <span className="post-photo-wrap">
                    <img className="post-photo" src={post.photo_url} alt="Post attachment preview" />
                </span>
            ) : null}
        </button>
    );
}