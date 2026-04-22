import React from "react";

interface BarangayScore {
    name: string;
    score: number;
    label?: string;
}

interface CityIndicator {
    label: string;
    value: number | string;
    interpretation: string;
    color: string;
}

export type ReportVariant = "full" | "green" | "hazard" | "calamity";

interface ReportProps {
    /** Full = all indices; single-index = focused PDF layout and content. */
    reportVariant?: ReportVariant;
    year?: number;
    cityName?: string;
    generatedDate?: string;
    greenChart?: string | null;
    greenIndexAvg?: number;
    greenIndexTrend?: { year: number; value: number }[];
    greenBarangays?: BarangayScore[];
    hazardChart?: string | null;
    hazardIndexAvg?: number;
    hazardIndexTrend?: { year: number; value: number }[];
    hazardBarangays?: BarangayScore[];
    riskChart?: string | null;
    calamityRiskAvg?: number;
    calamityRiskTrend?: { year: number; value: number }[];
    calamityBarangays?: BarangayScore[];
    greenMapImageUrl?: string;
    hazardMapImageUrl?: string;
    calamityMapImageUrl?: string;
    /** @deprecated kept for backwards compat — maps to hazardMapImageUrl */
    choroMapImageUrl?: string;
    greenInsights?: string[];
    hazardInsights?: string[];
    calamityInsights?: string[];
    keyFindings?: string[];
    recommendations?: string[];
}

const SAMPLE_TREND = [
    { year: 2020, value: 48.2 },
    { year: 2021, value: 51.0 },
    { year: 2022, value: 54.3 },
    { year: 2023, value: 57.8 },
    { year: 2024, value: 60.1 },
    { year: 2025, value: 61.5 },
    { year: 2026, value: 62.4 },
];

const SAMPLE_GREEN_BRGYS: BarangayScore[] = [
    { name: "Mamatid", score: 72, label: "High" },
    { name: "Sala", score: 68, label: "Moderate-High" },
    { name: "Pittland", score: 65, label: "Moderate-High" },
    { name: "Bigaa", score: 61, label: "Moderate" },
    { name: "Pulo", score: 58, label: "Moderate" },
];

const SAMPLE_HAZARD_BRGYS: BarangayScore[] = [
    { name: "Diezmo", score: 83, label: "Very High" },
    { name: "Sala", score: 81, label: "Very High" },
    { name: "Bigaa", score: 76, label: "High" },
    { name: "Pulo", score: 72, label: "High" },
    { name: "Real", score: 69, label: "High" },
];

const SAMPLE_RISK_BRGYS: BarangayScore[] = [
    { name: "Diezmo", score: 87, label: "Critical" },
    { name: "Sala", score: 83, label: "Critical" },
    { name: "Bigaa", score: 79, label: "High" },
    { name: "Marinig", score: 75, label: "High" },
    { name: "Real", score: 71, label: "Moderate-High" },
];

const SAMPLE_FINDINGS = [
    "Increasing hazard risk trend observed since 2020 across all barangays.",
    "Vegetation coverage is gradually improving citywide (+14.2 pts over 6 years).",
    "High-risk clusters are concentrated in flood-prone zones along river corridors.",
    "Green coverage above 65 statistically correlates with reduced calamity risk.",
    "Diezmo and Sala have crossed the critical risk threshold (Score > 80).",
];

const SAMPLE_RECOMMENDATIONS = [
    "Expand vegetation restoration programs in low-green-index barangays (Diezmo, Marinig, Niugan).",
    "Improve flood mitigation infrastructure in high-hazard zones along river corridors.",
    "Strengthen disaster preparedness programs in all barangays with Risk Score > 70.",
    "Enforce strict land use controls in flood-prone and landslide-susceptible zones.",
    "Institutionalize annual generation of this report as part of the city's climate action plan.",
];

const SAMPLE_GREEN_INSIGHTS = [
    "Western barangays show stronger vegetation recovery.",
    "Urban center areas have lower scores due to dense infrastructure.",
    "Vegetation coverage is gradually improving citywide.",
];

const SAMPLE_HAZARD_INSIGHTS = [
    "Flood-prone barangays along river corridors show the highest hazard scores.",
    "Hillside areas demonstrate increased landslide susceptibility.",
    "Earthquake and typhoon events can cause sharp spikes in hazard index.",
];

const SAMPLE_CALAMITY_INSIGHTS = [
    "Risk clusters appear in western and river-adjacent barangays.",
    "Risk is reduced in zones with higher vegetation coverage.",
    "Calamity risk likelihood is trending upward in high-exposure areas.",
];

/* ── Page-width constant shared by all sections ──────────────────────────── */
const PAGE_W = 794;
const PAGE_PAD = 40;

/* ── Reusable section wrapper ────────────────────────────────────────────── */
const Section: React.FC<{
    id: string;
    number: string;
    title: string;
    accent: string;
    newPage?: boolean;
    /** Tighter vertical rhythm (single-index reports). */
    compact?: boolean;
    children: React.ReactNode;
}> = ({ id, number, title, accent, newPage, compact, children }) => (
    <>
        {newPage && (
            <div
                style={{
                    pageBreakBefore: "always",
                    breakBefore: "page",
                    height: compact ? "8px" : "40px",
                }}
            />
        )}
        <section
            id={id}
            className="pdf-slice-after"
            style={{
                marginBottom: compact ? 14 : 32,
                borderRadius: 10,
                border: "1px solid #E0E0E0",
                overflow: "hidden",
                breakInside: compact ? "auto" : "avoid",
                pageBreakInside: compact ? "auto" : "avoid",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
        >
            <div
                style={{
                    background: accent,
                    padding: compact ? "8px 16px" : "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <span
                    style={{
                        background: "rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontFamily: "Georgia, serif",
                        fontSize: compact ? 9 : 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        letterSpacing: 1,
                    }}
                >
                    {number}
                </span>
                <h2
                    style={{
                        margin: 0,
                        color: "#fff",
                        fontSize: compact ? 13 : 14,
                        fontFamily: "Georgia, serif",
                        fontWeight: 700,
                        letterSpacing: 0.4,
                    }}
                >
                    {title}
                </h2>
            </div>
            <div style={{ padding: compact ? "12px 16px" : "16px 20px", background: "#fff" }}>{children}</div>
        </section>
    </>
);

const Placeholder: React.FC<{
    height?: number;
    label: string;
    hint?: string;
    accent?: string;
}> = ({ height = 160, label, hint, accent = "#2E7D32" }) => (
    <div
        style={{
            height,
            border: `2px dashed ${accent}55`,
            borderRadius: 8,
            background: `${accent}08`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            margin: "8px 0",
        }}
    >
        <span style={{ fontSize: 24, opacity: 0.4 }}>📊</span>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 700, color: accent, opacity: 0.7 }}>
            {label}
        </span>
        {hint && (
            <span style={{ fontSize: 10, color: "#9E9E9E", maxWidth: 280, textAlign: "center" }}>{hint}</span>
        )}
    </div>
);

const Sparkline: React.FC<{
    data: { year: number; value: number }[];
    color: string;
    width?: number;
    height?: number;
}> = ({ data, color, width = 200, height = 50 }) => {
    if (!data || data.length === 0) return null;
    const values = data.map((d) => d.value);
    const min = Math.min(...values) - 3;
    const max = Math.max(...values) + 3;
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 10) + 5;
        const y = height - 8 - ((d.value - min) / (max - min)) * (height - 16);
        return { x, y, ...d };
    });
    const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = [
        `M${pts[0].x},${height - 4}`,
        ...pts.map((p) => `L${p.x},${p.y}`),
        `L${pts[pts.length - 1].x},${height - 4}`,
        "Z",
    ].join(" ");
    return (
        <svg width={width} height={height} style={{ display: "block" }}>
            <defs>
                <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#grad-${color.replace("#", "")})`} />
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p) => (
                <circle key={p.year} cx={p.x} cy={p.y} r="2.5" fill={color} />
            ))}
            {pts.map((p) => (
                <text key={`l-${p.year}`} x={p.x} y={height} fontSize="7" fill="#9E9E9E" textAnchor="middle">
                    {p.year}
                </text>
            ))}
        </svg>
    );
};

const ScoreBadge: React.FC<{ value: number | string; bg: string; label: string }> = ({ value, bg, label }) => (
    <div
        style={{
            background: bg,
            borderRadius: 10,
            padding: "14px 16px",
            textAlign: "center",
            flex: 1,
            minWidth: 120,
        }}
    >
        <div style={{ fontSize: 9, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.85)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", color: "#fff", lineHeight: 1 }}>
            {value}
        </div>
    </div>
);

const BarangayBar: React.FC<{
    rank: number;
    name: string;
    score: number;
    label?: string;
    maxScore?: number;
    barColor: string;
}> = ({ rank, name, score, label, maxScore = 100, barColor }) => (
    <div className="pdf-slice-after" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
            style={{
                width: 20, height: 20, borderRadius: "50%", background: barColor, color: "#fff",
                fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
        >
            {rank}
        </span>
        <span style={{ width: 100, fontSize: 11, fontFamily: "Georgia, serif", color: "#333", flexShrink: 0 }}>
            {name}
        </span>
        <div style={{ flex: 1, height: 12, background: "#F0F0F0", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${(score / maxScore) * 100}%`, height: "100%", background: barColor, borderRadius: 6 }} />
        </div>
        <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: barColor, textAlign: "right" }}>{score}</span>
        {label && (
            <span style={{ fontSize: 9, color: "#777", background: "#F5F5F5", padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>
                {label}
            </span>
        )}
    </div>
);

const DataTable: React.FC<{
    headers: string[];
    rows: (string | number)[][];
    headerBg?: string;
}> = ({ headers, rows, headerBg = "#2E7D32" }) => (
    <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "Georgia, serif", marginTop: 6 }}
    >
        <thead>
            <tr>
                {headers.map((h) => (
                    <th key={h} style={{ background: headerBg, color: "#fff", padding: "6px 10px", textAlign: "left", fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FBF9" }}>
                    {row.map((cell, j) => (
                        <td key={j} style={{ padding: "5px 10px", borderBottom: "1px solid #E8E8E8", color: "#333" }}>
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

/* ── Map snapshot card used for all three index maps ─────────────────────── */
const MapSnapshotCard: React.FC<{
    title: string;
    description: string;
    imageUrl?: string;
    caption: string;
    accent: string;
    placeholderLabel: string;
    compact?: boolean;
}> = ({ title, description, imageUrl, caption, accent, placeholderLabel, compact }) => (
    <div className="pdf-slice-after" style={{ marginBottom: compact ? 8 : 16, breakInside: "avoid" as const }}>
        <h3 style={{ fontSize: compact ? 12 : 13, color: accent, margin: "0 0 4px", fontFamily: "Georgia, serif" }}>{title}</h3>
        <p style={{ fontSize: compact ? 10 : 11, lineHeight: 1.55, color: "#555", margin: "0 0 8px" }}>{description}</p>
        {imageUrl ? (
            <div
                style={{
                    textAlign: "center",
                    background: "#f4f4f4",
                    borderRadius: 8,
                    border: `1px solid ${accent}33`,
                    padding: compact ? "8px 4px" : "10px 6px",
                }}
            >
                <img
                    src={imageUrl}
                    alt={title}
                    style={{
                        maxWidth: "100%",
                        width: "auto",
                        height: "auto",
                        maxHeight: compact ? 228 : 300,
                        display: "inline-block",
                        verticalAlign: "middle",
                        objectFit: "contain",
                    }}
                />
            </div>
        ) : (
            <Placeholder height={compact ? 200 : 240} label={placeholderLabel} accent={accent} />
        )}
        <p style={{ fontSize: 10, color: "#9E9E9E", textAlign: "center", marginTop: 4, marginBottom: 0, fontStyle: "italic" }}>
            {caption}
        </p>
    </div>
);

/* ── Single-index reports: distinct cover + sections per index ───────────── */
type SingleMode = Exclude<ReportVariant, "full">;

const SINGLE_THEMES: Record<
    SingleMode,
    {
        label: string;
        coverGradient: string;
        docTitle: string;
        docSubtitle: string;
        accent: string;
        executive: (ctx: {
            cityName: string;
            year: number;
            green?: number;
            hazard?: number;
            calamity?: number;
        }) => React.ReactNode;
    }
> = {
    green: {
        label: "Green Index",
        coverGradient: "linear-gradient(148deg, #0d2818 0%, #1b4332 38%, #2d6a4f 72%, #40916c 100%)",
        docTitle: "Urban Vegetation & Ecological Health",
        docSubtitle: "Green Index — NDVI & Green Area Assessment",
        accent: "#2E7D32",
        executive: ({ cityName, year, green }) => (
            <>
                This <strong>Green Index</strong> report focuses on vegetation condition for <strong>{cityName}</strong> in{" "}
                <strong>{year}</strong>. The citywide Green Index stands at{" "}
                <strong style={{ color: "#2E7D32" }}>{green?.toFixed(1) ?? "—"}</strong>, reflecting combined{" "}
                <strong>NDVI</strong> and <strong>Green Area Ratio (GAR)</strong> signals. Use this document to prioritize
                greening, track barangay leaders and laggards, and align urban planning with ecological sustainability goals.
            </>
        ),
    },
    hazard: {
        label: "Hazard Index",
        coverGradient: "linear-gradient(148deg, #3e0808 0%, #7f1d1d 40%, #b91c1c 78%, #dc2626 100%)",
        docTitle: "Environmental Hazard Exposure",
        docSubtitle: "Flood · Landslide · Seismic & Weather Risk Profile",
        accent: "#B71C1C",
        executive: ({ cityName, year, hazard }) => (
            <>
                This <strong>Hazard Index</strong> report isolates environmental hazard exposure for <strong>{cityName}</strong> in{" "}
                <strong>{year}</strong>. The city average hazard score is{" "}
                <strong style={{ color: "#B71C1C" }}>{hazard?.toFixed(1) ?? "—"}</strong>, integrating flood and landslide
                susceptibility, seismic factors, weather, and infrastructure context. It supports mitigation planning and
                resource allocation toward the highest-risk barangays.
            </>
        ),
    },
    calamity: {
        label: "Calamity Risk",
        coverGradient: "linear-gradient(148deg, #431407 0%, #9a3412 45%, #ea580c 85%, #fb923c 100%)",
        docTitle: "Disaster Risk Likelihood",
        docSubtitle: "LSTM-Based Calamity Risk Forecast",
        accent: "#E65100",
        executive: ({ cityName, year, calamity }) => (
            <>
                This <strong>Calamity Risk Likelihood</strong> report summarizes modeled disaster risk for{" "}
                <strong>{cityName}</strong> in <strong>{year}</strong>. The citywide risk score is{" "}
                <strong style={{ color: "#E65100" }}>{calamity?.toFixed(1) ?? "—"}</strong>, blending hazard exposure with
                resilience indicators. It highlights where preparedness, early warning, and adaptation investments will have
                the greatest impact.
            </>
        ),
    },
};

const SingleIndexEnvironmentalReport: React.FC<ReportProps & { mode: SingleMode }> = ({
    mode,
    year = 2026,
    cityName = "City of Cabuyao, Laguna",
    generatedDate,
    greenChart,
    hazardChart,
    riskChart,
    greenIndexAvg = 0,
    greenIndexTrend = SAMPLE_TREND,
    greenBarangays = SAMPLE_GREEN_BRGYS,
    hazardIndexAvg = 0,
    hazardIndexTrend = SAMPLE_TREND,
    hazardBarangays = SAMPLE_HAZARD_BRGYS,
    calamityRiskAvg = 0,
    calamityRiskTrend = SAMPLE_TREND,
    calamityBarangays = SAMPLE_RISK_BRGYS,
    greenMapImageUrl,
    hazardMapImageUrl,
    calamityMapImageUrl,
    choroMapImageUrl,
    greenInsights = SAMPLE_GREEN_INSIGHTS,
    hazardInsights = SAMPLE_HAZARD_INSIGHTS,
    calamityInsights = SAMPLE_CALAMITY_INSIGHTS,
    keyFindings = SAMPLE_FINDINGS,
    recommendations = SAMPLE_RECOMMENDATIONS,
}) => {
    const displayDate =
        generatedDate ?? new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const theme = SINGLE_THEMES[mode];
    const effectiveHazardMap = hazardMapImageUrl ?? choroMapImageUrl;

    const spark =
        mode === "green" ? (
            <Sparkline data={greenIndexTrend} color="#2E7D32" width={240} height={48} />
        ) : mode === "hazard" ? (
            <Sparkline data={hazardIndexTrend} color="#B71C1C" width={240} height={48} />
        ) : (
            <Sparkline data={calamityRiskTrend} color="#E65100" width={240} height={48} />
        );

    const mapBlock =
        mode === "green" ? (
            <MapSnapshotCard
                title="Vegetation coverage (choropleth)"
                description={`Spatial distribution of the Green Index across barangays of ${cityName} for ${year}.`}
                imageUrl={greenMapImageUrl}
                caption={`Figure: Green Index map — ${cityName}, ${year}`}
                accent="#2E7D32"
                placeholderLabel="Green Index map"
                compact
            />
        ) : mode === "hazard" ? (
            <MapSnapshotCard
                title="Hazard exposure (choropleth)"
                description={`Spatial distribution of the Hazard Index across barangays of ${cityName} for ${year}.`}
                imageUrl={effectiveHazardMap}
                caption={`Figure: Hazard Index map — ${cityName}, ${year}`}
                accent="#B71C1C"
                placeholderLabel="Hazard Index map"
                compact
            />
        ) : (
            <MapSnapshotCard
                title="Calamity risk (choropleth)"
                description={`Spatial distribution of Calamity Risk Likelihood across barangays of ${cityName} for ${year}.`}
                imageUrl={calamityMapImageUrl}
                caption={`Figure: Calamity Risk map — ${cityName}, ${year}`}
                accent="#E65100"
                placeholderLabel="Calamity Risk map"
                compact
            />
        );

    return (
        <div
            id="environmental-report"
            style={{
                width: `${PAGE_W}px`,
                margin: "0 auto",
                padding: "28px 32px",
                boxSizing: "border-box",
                fontFamily: "Georgia, serif",
                background: "#FAFAFA",
                color: "#212121",
                position: "relative",
            }}
        >
            <div style={{ position: "relative", zIndex: 1 }}>
                <div
                    className="pdf-slice-after"
                    style={{
                        background: theme.coverGradient,
                        borderRadius: 12,
                        padding: "26px 28px 22px",
                        marginBottom: 14,
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            right: -30,
                            top: -30,
                            width: 180,
                            height: 180,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.06)",
                        }}
                    />
                    <div style={{ fontSize: 9, letterSpacing: 3.5, textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>
                        HazSpot · {theme.label} Report
                    </div>
                    <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: "#fff" }}>
                        {theme.docTitle}
                    </h1>
                    <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.88)", fontStyle: "italic" }}>
                        {theme.docSubtitle}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.92)" }}>{cityName}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        {[
                            { label: "Report Year", value: String(year) },
                            { label: "Generated", value: displayDate },
                        ].map((m) => (
                            <div key={m.label} style={{ background: "rgba(255,255,255,0.14)", borderRadius: 8, padding: "6px 14px", fontSize: 11 }}>
                                <span style={{ opacity: 0.75, marginRight: 6 }}>{m.label}:</span>
                                <span style={{ fontWeight: 700 }}>{m.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Section id="exec-single" number="01" title="Executive overview" accent={theme.accent} compact>
                    <p style={{ fontSize: 11, lineHeight: 1.65, color: "#333", margin: 0 }}>
                        {theme.executive({
                            cityName,
                            year,
                            green: greenIndexAvg,
                            hazard: hazardIndexAvg,
                            calamity: calamityRiskAvg,
                        })}
                    </p>
                </Section>

                <Section id="snapshot-single" number="02" title="City snapshot" accent="#37474F" compact>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8, justifyContent: "center" }}>
                        {mode === "green" && <ScoreBadge value={greenIndexAvg?.toFixed(1)} bg="#2E7D32" label="City Green Index" />}
                        {mode === "hazard" && <ScoreBadge value={hazardIndexAvg?.toFixed(1)} bg="#B71C1C" label="City Hazard Index" />}
                        {mode === "calamity" && <ScoreBadge value={calamityRiskAvg?.toFixed(1)} bg="#E65100" label="City Calamity Risk" />}
                    </div>
                    <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Historical trend (city aggregate)</div>
                    {spark}
                </Section>

                <Section id="analysis-single" number="03" title={`${theme.label} — analysis`} accent={theme.accent} compact>
                    {mode === "green" && (
                        <>
                            <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                                The Green Index combines <strong>NDVI</strong> and <strong>GAR</strong> to describe vegetation health per barangay.
                            </p>
                            {greenChart ? (
                                <div className="pdf-slice-after">
                                    <img src={greenChart} alt="Green chart" style={{ width: "100%", borderRadius: 8, border: "1px solid #ddd", margin: "6px 0" }} />
                                </div>
                            ) : (
                                <div className="pdf-slice-after">
                                    <Placeholder height={140} label="Green Index chart" accent="#2E7D32" />
                                </div>
                            )}
                            <h3 style={{ fontSize: 11, color: "#2E7D32", margin: "8px 0 4px" }}>Top barangays (Green Index)</h3>
                            {greenBarangays.map((b, i) => (
                                <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#2E7D32" />
                            ))}
                            <h3 style={{ fontSize: 11, color: "#2E7D32", margin: "8px 0 4px" }}>Insights</h3>
                            <ul style={{ fontSize: 10, lineHeight: 1.55, paddingLeft: 16, color: "#444", margin: 0 }}>
                                {greenInsights.map((t, i) => (
                                    <li key={i} className="pdf-slice-after">{t}</li>
                                ))}
                            </ul>
                        </>
                    )}
                    {mode === "hazard" && (
                        <>
                            <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                                The Hazard Index aggregates flood, landslide, seismic, weather, and built-environment factors.
                            </p>
                            {hazardChart ? (
                                <div className="pdf-slice-after">
                                    <img src={hazardChart} alt="Hazard chart" style={{ width: "100%", borderRadius: 8, margin: "6px 0" }} />
                                </div>
                            ) : (
                                <div className="pdf-slice-after">
                                    <Placeholder height={140} label="Hazard Index chart" accent="#B71C1C" />
                                </div>
                            )}
                            <h3 style={{ fontSize: 11, color: "#B71C1C", margin: "8px 0 4px" }}>Highest hazard barangays</h3>
                            {hazardBarangays.map((b, i) => (
                                <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#B71C1C" />
                            ))}
                            <h3 style={{ fontSize: 11, color: "#B71C1C", margin: "8px 0 4px" }}>Insights</h3>
                            <ul style={{ fontSize: 10, lineHeight: 1.55, paddingLeft: 16, color: "#444", margin: 0 }}>
                                {hazardInsights.map((t, i) => (
                                    <li key={i} className="pdf-slice-after">{t}</li>
                                ))}
                            </ul>
                        </>
                    )}
                    {mode === "calamity" && (
                        <>
                            <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                                Calamity Risk Likelihood is produced by an <strong>LSTM</strong> model trained on historical events and index drivers.
                            </p>
                            {riskChart ? (
                                <div className="pdf-slice-after">
                                    <img src={riskChart} alt="Calamity chart" style={{ width: "100%", borderRadius: 8, margin: "6px 0" }} />
                                </div>
                            ) : (
                                <div className="pdf-slice-after">
                                    <Placeholder height={140} label="Calamity Risk chart" accent="#E65100" />
                                </div>
                            )}
                            <h3 style={{ fontSize: 11, color: "#E65100", margin: "8px 0 4px" }}>Highest risk barangays</h3>
                            {calamityBarangays.map((b, i) => (
                                <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#E65100" />
                            ))}
                            <h3 style={{ fontSize: 11, color: "#E65100", margin: "8px 0 4px" }}>Insights</h3>
                            <ul style={{ fontSize: 10, lineHeight: 1.55, paddingLeft: 16, color: "#444", margin: 0 }}>
                                {calamityInsights.map((t, i) => (
                                    <li key={i} className="pdf-slice-after">{t}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </Section>

                <Section id="map-single" number="04" title="Map snapshot" accent="#455a64" newPage compact>
                    {mapBlock}
                </Section>

                <Section id="findings-single" number="05" title="Key findings" accent="#1565C0" compact>
                    <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                        {keyFindings.map((finding, i) => (
                            <li
                                key={i}
                                className="pdf-slice-after"
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    marginBottom: 8,
                                    fontSize: 11,
                                    lineHeight: 1.65,
                                    color: "#333",
                                }}
                            >
                                <span
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: "50%",
                                        background: "#1565C0",
                                        color: "#fff",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginTop: 1,
                                    }}
                                >
                                    {i + 1}
                                </span>
                                {finding}
                            </li>
                        ))}
                    </ul>
                    <p style={{ fontSize: 10, color: "#9E9E9E", fontStyle: "italic", marginTop: 10, paddingTop: 8, borderTop: "1px solid #EEE" }}>
                        * AI-assisted summary — subject to expert review.
                    </p>
                </Section>

                <Section id="rec-single" number="06" title="Recommendations" accent="#4A148C" compact>
                    <ol style={{ paddingLeft: 18, margin: 0 }}>
                        {recommendations.map((rec, i) => (
                            <li key={i} className="pdf-slice-after" style={{ fontSize: 11, lineHeight: 1.75, color: "#333", marginBottom: 6, paddingLeft: 4 }}>
                                {rec}
                            </li>
                        ))}
                    </ol>
                    <p style={{ fontSize: 10, color: "#9E9E9E", fontStyle: "italic", marginTop: 10, paddingTop: 8, borderTop: "1px solid #EEE" }}>
                        * AI-assisted — validate with local plans and regulations.
                    </p>
                </Section>
            </div>

            <div
                className="pdf-slice-after"
                style={{
                    borderTop: "2px solid #E0E0E0",
                    paddingTop: 12,
                    textAlign: "center",
                    fontSize: 9,
                    color: "#9E9E9E",
                    lineHeight: 1.6,
                }}
            >
                <strong style={{ color: "#555" }}>HazSpot</strong>
                <br />
                {theme.label} · {cityName} · {year} · {displayDate}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REPORT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EnvironmentalReportTemplate: React.FC<ReportProps> = ({
    reportVariant = "full",
    year = 2026,
    cityName = "City of Cabuyao, Laguna",
    generatedDate,
    greenChart,
    hazardChart,
    riskChart,
    greenIndexAvg = 62.4,
    greenIndexTrend = SAMPLE_TREND,
    greenBarangays = SAMPLE_GREEN_BRGYS,
    hazardIndexAvg = 48.1,
    hazardIndexTrend = SAMPLE_TREND.map((d) => ({ ...d, value: d.value * 0.77 })),
    hazardBarangays = SAMPLE_HAZARD_BRGYS,
    calamityRiskAvg = 56.2,
    calamityRiskTrend = SAMPLE_TREND.map((d) => ({ ...d, value: d.value * 0.9 })),
    calamityBarangays = SAMPLE_RISK_BRGYS,
    greenMapImageUrl,
    hazardMapImageUrl,
    calamityMapImageUrl,
    choroMapImageUrl,
    greenInsights = SAMPLE_GREEN_INSIGHTS,
    hazardInsights = SAMPLE_HAZARD_INSIGHTS,
    calamityInsights = SAMPLE_CALAMITY_INSIGHTS,
    keyFindings = SAMPLE_FINDINGS,
    recommendations = SAMPLE_RECOMMENDATIONS,
}) => {
    if (reportVariant !== "full") {
        return (
            <SingleIndexEnvironmentalReport
                mode={reportVariant}
                reportVariant={reportVariant}
                year={year}
                cityName={cityName}
                generatedDate={generatedDate}
                greenChart={greenChart}
                hazardChart={hazardChart}
                riskChart={riskChart}
                greenIndexAvg={greenIndexAvg}
                greenIndexTrend={greenIndexTrend}
                greenBarangays={greenBarangays}
                hazardIndexAvg={hazardIndexAvg}
                hazardIndexTrend={hazardIndexTrend}
                hazardBarangays={hazardBarangays}
                calamityRiskAvg={calamityRiskAvg}
                calamityRiskTrend={calamityRiskTrend}
                calamityBarangays={calamityBarangays}
                greenMapImageUrl={greenMapImageUrl}
                hazardMapImageUrl={hazardMapImageUrl}
                calamityMapImageUrl={calamityMapImageUrl}
                choroMapImageUrl={choroMapImageUrl}
                greenInsights={greenInsights}
                hazardInsights={hazardInsights}
                calamityInsights={calamityInsights}
                keyFindings={keyFindings}
                recommendations={recommendations}
            />
        );
    }

    const displayDate =
        generatedDate ?? new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

    const effectiveHazardMap = hazardMapImageUrl ?? choroMapImageUrl;

    const computedIndicators: CityIndicator[] = [
        { label: "Green Index", value: greenIndexAvg?.toFixed(1) ?? "0", interpretation: "Urban vegetation coverage level", color: "#2E7D32" },
        { label: "Hazard Index", value: hazardIndexAvg?.toFixed(1) ?? "0", interpretation: "Environmental hazard exposure", color: "#B71C1C" },
        { label: "Calamity Risk Likelihood", value: calamityRiskAvg?.toFixed(1) ?? "0", interpretation: "Combined disaster risk probability", color: "#E65100" },
    ];

    return (
        <div
            id="environmental-report"
            style={{
                width: `${PAGE_W}px`,
                margin: "0 auto",
                padding: `${PAGE_PAD}px`,
                boxSizing: "border-box",
                fontFamily: "Georgia, serif",
                background: "#FAFAFA",
                color: "#212121",
                position: "relative",
            }}
        >
            <div style={{ position: "relative", zIndex: 1 }}>

                {/* ── PAGE 1: COVER + EXECUTIVE SUMMARY + INDICATORS ─────────────── */}

                {/* HEADER / COVER */}
                <div
                    className="pdf-slice-after"
                    style={{
                        background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #388E3C 100%)",
                        borderRadius: 12,
                        padding: "32px 36px 28px",
                        marginBottom: 28,
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <img
                        src="/cdrrmo_logo.png"
                        alt="CDRRMO Logo"
                        style={{
                            position: "absolute", right: -40, top: -40, width: 200, opacity: 0.08,
                            pointerEvents: "none", filter: "brightness(200%)",
                        }}
                    />
                    <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                        Official Report
                    </div>
                    <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, lineHeight: 1.25, color: "#fff" }}>
                        Environmental Risk and<br />Sustainability Assessment Report
                    </h1>
                    <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{cityName}</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {[
                            { label: "Report Year", value: String(year) },
                            { label: "Generated", value: displayDate },
                        ].map((m) => (
                            <div key={m.label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 12px", fontSize: 11 }}>
                                <span style={{ color: "rgba(255,255,255,0.6)", marginRight: 5 }}>{m.label}:</span>
                                <span style={{ fontWeight: 700, color: "#fff" }}>{m.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 02 — EXECUTIVE SUMMARY */}
                <Section id="executive-summary" number="02" title="Executive Summary" accent="#1B5E20">
                    <p style={{ fontSize: 12, lineHeight: 1.75, color: "#333", margin: 0 }}>
                        This report summarizes the environmental sustainability and hazard risk conditions of{" "}
                        <strong>{cityName}</strong> for the year <strong>{year}</strong>. The{" "}
                        <strong style={{ color: "#2E7D32" }}>Green Index</strong> indicates improving urban vegetation
                        coverage across several barangays, with a city average of{" "}
                        <strong style={{ color: "#2E7D32" }}>{greenIndexAvg?.toFixed(1)}</strong>. However, the{" "}
                        <strong style={{ color: "#B71C1C" }}>Hazard Index</strong> remains elevated in flood-prone
                        and landslide-prone areas (city average:{" "}
                        <strong style={{ color: "#B71C1C" }}>{hazardIndexAvg?.toFixed(1)}</strong>). The combined analysis suggests a{" "}
                        <strong style={{ color: "#E65100" }}>moderate-to-high Calamity Risk Likelihood</strong> (score:{" "}
                        <strong style={{ color: "#E65100" }}>{calamityRiskAvg?.toFixed(1)}</strong>) for selected barangays, particularly those near river systems and steep terrain.
                    </p>
                </Section>

                {/* SECTION 03 — CITYWIDE INDICATORS */}
                <Section id="citywide-indicators" number="03" title="Citywide Indicators" accent="#37474F">
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                        <ScoreBadge value={greenIndexAvg?.toFixed(1)} bg="#2E7D32" label="Green Index" />
                        <ScoreBadge value={hazardIndexAvg?.toFixed(1)} bg="#B71C1C" label="Hazard Index" />
                        <ScoreBadge value={calamityRiskAvg?.toFixed(1)} bg="#E65100" label="Calamity Risk" />
                    </div>
                    <DataTable
                        headers={["Indicator", "City Average", "Interpretation"]}
                        rows={computedIndicators.map((i) => [i.label, String(i.value), i.interpretation])}
                    />
                    <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
                        {[
                            { label: "Green Index Trend", data: greenIndexTrend, color: "#2E7D32" },
                            { label: "Hazard Index Trend", data: hazardIndexTrend, color: "#B71C1C" },
                            { label: "Calamity Risk Trend", data: calamityRiskTrend, color: "#E65100" },
                        ].map((chart) => (
                            <div key={chart.label} style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: 9, color: "#777", marginBottom: 3, letterSpacing: 0.5 }}>{chart.label}</div>
                                <Sparkline data={chart.data} color={chart.color} width={200} height={50} />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── PAGE 2: GREEN INDEX ─────────────────────────────────────────── */}
                <Section id="green-index" number="04" title="Green Index Analysis" accent="#2E7D32" newPage>
                    <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                        The Green Index measures vegetation health using the{" "}
                        <strong>Normalized Difference Vegetation Index (NDVI)</strong> and{" "}
                        <strong>Green Area Ratio (GAR)</strong>. Higher values indicate stronger ecological
                        sustainability and vegetation presence across a barangay.
                    </p>
                    {greenChart ? (
                        <div className="pdf-slice-after">
                            <img src={greenChart} alt="Green Index Chart" style={{ width: "100%", borderRadius: 8, border: "1px solid #ddd", margin: "8px 0" }} />
                        </div>
                    ) : (
                        <div className="pdf-slice-after">
                            <Placeholder height={180} label="Green Index Chart" />
                        </div>
                    )}
                    <h3 style={{ fontSize: 12, color: "#2E7D32", margin: "14px 0 8px" }}>Barangay Rankings</h3>
                    {greenBarangays.map((b, i) => (
                        <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#2E7D32" />
                    ))}
                    <h3 style={{ fontSize: 12, color: "#2E7D32", margin: "14px 0 6px" }}>Insights</h3>
                    <ul style={{ fontSize: 11, lineHeight: 1.65, paddingLeft: 16, color: "#444", margin: 0 }}>
                        {greenInsights.map((insight, i) => (
                            <li key={i} className="pdf-slice-after">{insight}</li>
                        ))}
                    </ul>
                </Section>

                {/* ── PAGE 3: HAZARD INDEX ────────────────────────────────────────── */}
                <Section id="hazard-index" number="05" title="Hazard Index Analysis" accent="#B71C1C" newPage>
                    <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                        The Hazard Index reflects exposure to <strong>flood susceptibility</strong>,{" "}
                        <strong>landslide susceptibility</strong>, <strong>weather data</strong>,{" "}
                        <strong>earthquake frequency</strong>, <strong>faultline proximity</strong>,{" "}
                        <strong>population</strong>, and <strong>infrastructure</strong>. The composite score is
                        computed from weighted sub-indicators sourced from OpenMeteo, U.S. Geological Survey,
                        OpenStreetMap, PSA, and Google Earth Engine.
                    </p>
                    {hazardChart ? (
                        <div className="pdf-slice-after">
                            <img src={hazardChart} alt="Hazard Index Chart" style={{ width: "100%", borderRadius: 8, margin: "8px 0" }} />
                        </div>
                    ) : (
                        <div className="pdf-slice-after">
                            <Placeholder height={180} label="Hazard Index Chart" />
                        </div>
                    )}
                    <h3 style={{ fontSize: 12, color: "#B71C1C", margin: "14px 0 8px" }}>Highest Risk Barangays</h3>
                    {hazardBarangays.map((b, i) => (
                        <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#B71C1C" />
                    ))}
                    <h3 style={{ fontSize: 12, color: "#B71C1C", margin: "14px 0 6px" }}>Insights</h3>
                    <ul style={{ fontSize: 11, lineHeight: 1.65, paddingLeft: 16, color: "#444", margin: 0 }}>
                        {hazardInsights.map((insight, i) => (
                            <li key={i} className="pdf-slice-after">{insight}</li>
                        ))}
                    </ul>
                </Section>

                {/* ── PAGE 4: CALAMITY RISK ───────────────────────────────────────── */}
                <Section id="calamity-risk" number="06" title="Calamity Risk Likelihood" accent="#E65100" newPage>
                    <p style={{ fontSize: 11, lineHeight: 1.65, color: "#444", marginTop: 0 }}>
                        Calamity Risk Likelihood represents the combined probability of disaster impact,
                        considering both hazard exposure and environmental resilience. The score is computed
                        using a <strong>Long Short-Term Memory model</strong> trained on historical
                        calamity occurrence data.
                    </p>
                    {riskChart ? (
                        <div className="pdf-slice-after">
                            <img src={riskChart} alt="Calamity Risk Chart" style={{ width: "100%", borderRadius: 8, margin: "8px 0" }} />
                        </div>
                    ) : (
                        <div className="pdf-slice-after">
                            <Placeholder height={180} label="Calamity Risk Chart" />
                        </div>
                    )}
                    <h3 style={{ fontSize: 12, color: "#E65100", margin: "14px 0 8px" }}>Highest Risk Barangays</h3>
                    {calamityBarangays.map((b, i) => (
                        <BarangayBar key={b.name} rank={i + 1} name={b.name} score={b.score} label={b.label} barColor="#E65100" />
                    ))}
                    <h3 style={{ fontSize: 12, color: "#E65100", margin: "14px 0 6px" }}>Insights</h3>
                    <ul style={{ fontSize: 11, lineHeight: 1.65, paddingLeft: 16, color: "#444", margin: 0 }}>
                        {calamityInsights.map((insight, i) => (
                            <li key={i} className="pdf-slice-after">{insight}</li>
                        ))}
                    </ul>
                </Section>

                {/* ── PAGE 5: GREEN INDEX MAP SNAPSHOT ────────────────────────────── */}
                <Section id="green-map" number="07" title="Green Index — Spatial Distribution" accent="#2E7D32" newPage>
                    <MapSnapshotCard
                        title="Vegetation Coverage Map"
                        description={`The map below shows the spatial distribution of the Green Index across all barangays of ${cityName} for ${year}. Each barangay is color-coded based on its computed vegetation score — darker greens indicate higher vegetation coverage and ecological health.`}
                        imageUrl={greenMapImageUrl}
                        caption={`Figure 1: Green Index Choropleth Map by Barangay, ${cityName}, ${year}`}
                        accent="#2E7D32"
                        placeholderLabel="Green Index Map"
                    />
                </Section>

                {/* ── PAGE 6: HAZARD INDEX MAP SNAPSHOT ───────────────────────────── */}
                <Section id="hazard-map" number="08" title="Hazard Index — Spatial Distribution" accent="#B71C1C" newPage>
                    <MapSnapshotCard
                        title="Hazard Exposure Map"
                        description={`The map below shows the spatial distribution of the Hazard Index across all barangays of ${cityName} for ${year}. Each barangay is color-coded based on its computed hazard score — darker reds indicate higher environmental hazard exposure, including flood, landslide, and seismic risks.`}
                        imageUrl={effectiveHazardMap}
                        caption={`Figure 2: Hazard Index Choropleth Map by Barangay, ${cityName}, ${year}`}
                        accent="#B71C1C"
                        placeholderLabel="Hazard Index Map"
                    />
                </Section>

                {/* ── PAGE 7: CALAMITY RISK MAP SNAPSHOT ──────────────────────────── */}
                <Section id="calamity-map" number="09" title="Calamity Risk — Spatial Distribution" accent="#E65100" newPage>
                    <MapSnapshotCard
                        title="Calamity Risk Map"
                        description={`The map below shows the spatial distribution of the Calamity Risk Likelihood across all barangays of ${cityName} for ${year}. Each barangay is color-coded based on its combined disaster risk probability — darker oranges indicate higher calamity risk driven by both hazard exposure and low environmental resilience.`}
                        imageUrl={calamityMapImageUrl}
                        caption={`Figure 3: Calamity Risk Choropleth Map by Barangay, ${cityName}, ${year}`}
                        accent="#E65100"
                        placeholderLabel="Calamity Risk Map"
                    />
                </Section>

                {/* ── PAGE 8: KEY FINDINGS ────────────────────────────────────────── */}
                <Section id="key-findings" number="10" title="Key Findings" accent="#1565C0" newPage>
                    <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                        {keyFindings.map((finding, i) => (
                            <li
                                key={i}
                                className="pdf-slice-after"
                                style={{
                                    display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8,
                                    fontSize: 11, lineHeight: 1.65, color: "#333",
                                }}
                            >
                                <span
                                    style={{
                                        width: 20, height: 20, borderRadius: "50%", background: "#1565C0", color: "#fff",
                                        fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center",
                                        justifyContent: "center", flexShrink: 0, marginTop: 1,
                                    }}
                                >
                                    {i + 1}
                                </span>
                                {finding}
                            </li>
                        ))}
                    </ul>
                    <p style={{ fontSize: 10, color: "#9E9E9E", fontStyle: "italic", marginTop: 12, marginBottom: 0, paddingTop: 8, borderTop: "1px solid #EEE" }}>
                        * Automatically generated — please have an expert review for final assessment.
                    </p>
                </Section>

                {/* ── SECTION 11: RECOMMENDATIONS ────────────────────────────────── */}
                <Section id="recommendations" number="11" title="Recommendations" accent="#4A148C">
                    <ol style={{ paddingLeft: 18, margin: 0 }}>
                        {recommendations.map((rec, i) => (
                            <li key={i} className="pdf-slice-after" style={{ fontSize: 11, lineHeight: 1.75, color: "#333", marginBottom: 6, paddingLeft: 4 }}>
                                {rec}
                            </li>
                        ))}
                    </ol>
                    <p style={{ fontSize: 10, color: "#9E9E9E", fontStyle: "italic", marginTop: 12, marginBottom: 0, paddingTop: 8, borderTop: "1px solid #EEE" }}>
                        * Automatically generated — please have an expert review for final assessment.
                    </p>
                </Section>
            </div>

            {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
            <div
                className="pdf-slice-after"
                style={{
                    borderTop: "2px solid #E0E0E0",
                    paddingTop: 14,
                    textAlign: "center",
                    fontSize: 9,
                    color: "#9E9E9E",
                    lineHeight: 1.6,
                }}
            >
                <strong style={{ color: "#555" }}>HazSpot</strong>
                <br />
                {cityName} · Report Year {year} · Generated {displayDate}
                <br />
                This report is automatically generated for planning and academic purposes.
                For emergency response, refer to official government agencies bulletins.
            </div>
        </div>
    );
};

export default EnvironmentalReportTemplate;
