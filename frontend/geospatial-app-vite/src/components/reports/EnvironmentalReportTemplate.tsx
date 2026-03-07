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

interface ReportProps {
    year?: number;
    cityName?: string;
    generatedDate?: string;
    // Section 3 — Citywide Indicators
    indicators?: CityIndicator[];
    // Section 4 — Green Index
    greenChart?: string | null;
    greenIndexAvg?: number;
    greenIndexTrend?: { year: number; value: number }[];
    greenBarangays?: BarangayScore[];
    // Section 5 — Hazard Index
    hazardChart?: string | null;
    hazardIndexAvg?: number;
    hazardIndexTrend?: { year: number; value: number }[];
    hazardBarangays?: BarangayScore[];
    // Section 6 — Calamity Risk
    riskChart?: string | null;
    calamityRiskAvg?: number;
    calamityRiskTrend?: { year: number; value: number }[];
    calamityBarangays?: BarangayScore[];
    // Section 7 — Map
    choroMapImageUrl?: string;
    // Section 8 — Key Findings
    keyFindings?: string[];
    // Section 9 — Recommendations
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

// Eto yung nasa left panel dapat na insights papakita
const SAMPLE_RECOMMENDATIONS = [
    "Expand vegetation restoration programs in low-green-index barangays (Diezmo, Marinig, Niugan).",
    "Improve flood mitigation infrastructure in high-hazard zones along river corridors.",
    "Strengthen disaster preparedness programs in all barangays with Risk Score > 70.",
    "Enforce strict land use controls in flood-prone and landslide-susceptible zones.",
    "Institutionalize annual generation of this report as part of the city's climate action plan.",
];

/** Coloured top-border section card */
const Section: React.FC<{
    id: string;
    number: string;
    title: string;
    accent: string;
    newPage?: boolean;
    children: React.ReactNode;
}> = ({ id, number, title, accent, newPage, children }) => (
    <>
        {newPage && (
            <div
                style={{
                    pageBreakBefore: "always",
                    breakBefore: "page",
                    height: "40px"
                }}
            />
        )}

        <section
            id={id}
            style={{
                marginBottom: 40,
                borderRadius: 10,
                border: "1px solid #E0E0E0",
                overflow: "hidden",
                breakInside: "avoid",
                pageBreakInside: "avoid",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
        >
            {/* Section header bar */}
            <div
                style={{
                    background: accent,
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <span
                    style={{
                        background: "rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontFamily: "Georgia, serif",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
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
                        fontSize: 16,
                        fontFamily: "Georgia, serif",
                        fontWeight: 700,
                        letterSpacing: 0.4,
                    }}
                >
                    {title}
                </h2>
            </div>

            <div style={{ padding: "20px 24px", background: "#fff" }}>
                {children}
            </div>
        </section>
    </>
);


/** Generic placeholder box for charts/maps/images */
const Placeholder: React.FC<{
    height?: number;
    label: string;
    hint?: string;
    accent?: string;
}> = ({ height = 180, label, hint, accent = "#2E7D32" }) => (
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
            gap: 6,
            margin: "12px 0",
        }}
    >
        <span style={{ fontSize: 28, opacity: 0.4 }}>📊</span>
        <span
            style={{
                fontFamily: "Georgia, serif",
                fontSize: 13,
                fontWeight: 700,
                color: accent,
                opacity: 0.7,
            }}
        >
            {label}
        </span>
        {hint && (
            <span style={{ fontSize: 11, color: "#9E9E9E", maxWidth: 300, textAlign: "center" }}>
                {hint}
            </span>
        )}
    </div>
);

const Sparkline: React.FC<{
    data: { year: number; value: number }[];
    color: string;
    width?: number;
    height?: number;
}> = ({ data, color, width = 220, height = 55 }) => {
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
            <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {pts.map((p) => (
                <circle key={p.year} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
            {/* Year labels */}
            {pts.map((p) => (
                <text key={`l-${p.year}`} x={p.x} y={height} fontSize="8" fill="#9E9E9E" textAnchor="middle">
                    {p.year}
                </text>
            ))}
        </svg>
    );
};

/** Score badge */
const ScoreBadge: React.FC<{ value: number | string; bg: string; label: string }> = ({
    value,
    bg,
    label,
}) => (
    <div
        style={{
            background: bg,
            borderRadius: 10,
            padding: "16px 20px",
            textAlign: "center",
            flex: 1,
            minWidth: 140,
        }}
    >
        <div
            style={{
                fontSize: 11,
                fontFamily: "Georgia, serif",
                color: "rgba(255,255,255,0.85)",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
            }}
        >
            {label}
        </div>
        <div
            style={{
                fontSize: 34,
                fontWeight: 800,
                fontFamily: "Georgia, serif",
                color: "#fff",
                lineHeight: 1,
            }}
        >
            {value}
        </div>
    </div>
);

/** Horizontal bar for barangay rankings */
const BarangayBar: React.FC<{
    rank: number;
    name: string;
    score: number;
    label?: string;
    maxScore?: number;
    barColor: string;
}> = ({ rank, name, score, label, maxScore = 100, barColor }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
            style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: barColor,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            {rank}
        </span>
        <span
            style={{
                width: 110,
                fontSize: 12,
                fontFamily: "Georgia, serif",
                color: "#333",
                flexShrink: 0,
            }}
        >
            {name}
        </span>
        <div
            style={{
                flex: 1,
                height: 14,
                background: "#F0F0F0",
                borderRadius: 7,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    width: `${(score / maxScore) * 100}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: 7,
                    transition: "width 0.4s ease",
                }}
            />
        </div>
        <span style={{ width: 30, fontSize: 12, fontWeight: 700, color: barColor, textAlign: "right" }}>
            {score}
        </span>
        {label && (
            <span
                style={{
                    fontSize: 10,
                    color: "#777",
                    background: "#F5F5F5",
                    padding: "1px 7px",
                    borderRadius: 10,
                    flexShrink: 0,
                }}
            >
                {label}
            </span>
        )}
    </div>
);

/** Simple styled table */
const DataTable: React.FC<{
    headers: string[];
    rows: (string | number)[][];
    headerBg?: string;
}> = ({ headers, rows, headerBg = "#2E7D32" }) => (
    <table
        style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            fontFamily: "Georgia, serif",
            marginTop: 8,
        }}
    >
        <thead>
            <tr>
                {headers.map((h) => (
                    <th
                        key={h}
                        style={{
                            background: headerBg,
                            color: "#fff",
                            padding: "8px 12px",
                            textAlign: "left",
                            fontWeight: 700,
                            fontSize: 11,
                            letterSpacing: 0.5,
                        }}
                    >
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FBF9" }}>
                    {row.map((cell, j) => (
                        <td
                            key={j}
                            style={{
                                padding: "7px 12px",
                                borderBottom: "1px solid #E8E8E8",
                                color: "#333",
                            }}
                        >
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REPORT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EnvironmentalReportTemplate: React.FC<ReportProps> = ({
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
    choroMapImageUrl,
    keyFindings = SAMPLE_FINDINGS,
    recommendations = SAMPLE_RECOMMENDATIONS,
}) => {
    const displayDate =
        generatedDate ?? new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

    const computedIndicators: CityIndicator[] = [
        {
            label: "Green Index",
            value: greenIndexAvg?.toFixed(1) ?? "0",
            interpretation: "Urban vegetation coverage level",
            color: "#2E7D32"
        },
        {
            label: "Hazard Index",
            value: hazardIndexAvg?.toFixed(1) ?? "0",
            interpretation: "Environmental hazard exposure",
            color: "#B71C1C"
        },
        {
            label: "Calamity Risk Likelihood",
            value: calamityRiskAvg?.toFixed(1) ?? "0",
            interpretation: "Combined disaster risk probability",
            color: "#E65100"
        }
    ];

    return (
        <div
            id="environmental-report"
            style={{
                width: "794px",
                margin: "0 auto",
                padding: "40px",
                boxSizing: "border-box",
                fontFamily: "Georgia, serif",
                background: "#FAFAFA",
                color: "#212121",
                position: "relative"
            }}
        >
            <div style={{ position: "relative", zIndex: 1 }}>

                {/* ── SECTION 1: REPORT HEADER / COVER ─────────────────────────────── */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #388E3C 100%)",
                        borderRadius: 12,
                        padding: "36px 40px 32px",
                        marginBottom: 32,
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >

                    <img
                        src="/cdrrmo_logo.png"
                        alt="CDRRMO Logo"
                        style={{
                            position: "absolute",
                            right: -40,
                            top: -40,
                            width: 220,
                            opacity: 0.08,
                            pointerEvents: "none",
                            filter: "brightness(200%)",
                        }}
                    />

                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: 3,
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.65)",
                            marginBottom: 8,
                        }}
                    >
                        Official Report
                    </div>
                    <h1
                        style={{
                            margin: "0 0 6px",
                            fontSize: 26,
                            fontWeight: 800,
                            lineHeight: 1.2,
                            color: "#fff",
                        }}
                    >
                        Environmental Risk and<br />Sustainability Assessment Report
                    </h1>
                    <p style={{ margin: "0 0 20px", fontSize: 15, color: "rgba(255,255,255,0.85)" }}>
                        {cityName}
                    </p>

                    {/* Meta chips */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {[
                            { label: "Report Year", value: String(year) },
                            { label: "Generated", value: displayDate },
                        ].map((m) => (
                            <div
                                key={m.label}
                                style={{
                                    background: "rgba(255,255,255,0.15)",
                                    borderRadius: 6,
                                    padding: "6px 14px",
                                    fontSize: 12,
                                }}
                            >
                                <span style={{ color: "rgba(255,255,255,0.65)", marginRight: 6 }}>{m.label}:</span>
                                <span style={{ fontWeight: 700, color: "#fff" }}>{m.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── SECTION 2: EXECUTIVE SUMMARY ──────────────────────────────────── */}
                <Section id="executive-summary" number="02" title="Executive Summary" accent="#1B5E20">
                    {/*
          TODO: Replace this paragraph with auto-generated text from your system.
          You can build a template string using the actual index values passed as props.
        */}
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#333", margin: 0 }}>
                        This report summarizes the environmental sustainability and hazard risk conditions of{" "}
                        <strong>{cityName}</strong> for the year <strong>{year}</strong>. The{" "}

                        <strong style={{ color: "#2E7D32" }}>Green Index</strong> indicates improving urban vegetation
                        coverage across several barangays, with a city average of{" "}
                        <strong style={{ color: "#2E7D32" }}>
                            {greenIndexAvg?.toFixed(1)}
                        </strong>. However, the{" "}

                        <strong style={{ color: "#B71C1C" }}>Hazard Index</strong> remains elevated in flood-prone
                        and landslide-prone areas (city average:{" "}
                        <strong style={{ color: "#B71C1C" }}>
                            {hazardIndexAvg?.toFixed(1)}
                        </strong>). The combined analysis suggests a{" "}

                        <strong style={{ color: "#E65100" }}>moderate-to-high Calamity Risk Likelihood</strong>{" "}
                        (score:{" "}
                        <strong style={{ color: "#E65100" }}>
                            {calamityRiskAvg?.toFixed(1)}
                        </strong>) for selected barangays, particularly those near river systems and steep terrain.
                    </p>
                </Section>

                {/* ── SECTION 3: CITYWIDE INDICATORS ───────────────────────────────── */}
                <Section id="citywide-indicators" number="03" title="Citywide Indicators" accent="#37474F">
                    {/* Score badge row */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <ScoreBadge value={greenIndexAvg?.toFixed(1)} bg="#2E7D32" label="Green Index" />
                        <ScoreBadge value={hazardIndexAvg?.toFixed(1)} bg="#B71C1C" label="Hazard Index" />
                        <ScoreBadge value={calamityRiskAvg?.toFixed(1)} bg="#E65100" label="Calamity Risk" />
                    </div>

                    {/* Indicator table */}
                    <DataTable
                        headers={["Indicator", "City Average", "Interpretation"]}
                        rows={computedIndicators.map((i) => [i.label, String(i.value), i.interpretation])}
                    />

                    {/* Sparkline mini-charts */}
                    <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
                        {[
                            { label: "Green Index Trend", data: greenIndexTrend, color: "#2E7D32" },
                            { label: "Hazard Index Trend", data: hazardIndexTrend, color: "#B71C1C" },
                            { label: "Calamity Risk Trend", data: calamityRiskTrend, color: "#E65100" },
                        ].map((chart) => (
                            <div key={chart.label} style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontSize: 10, color: "#777", marginBottom: 4, letterSpacing: 0.5 }}>
                                    {chart.label}
                                </div>
                                <Sparkline data={chart.data} color={chart.color} width={210} height={60} />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── SECTION 4: GREEN INDEX ANALYSIS ──────────────────────────────── */}
                <Section id="green-index" number="04" title="Green Index Analysis" accent="#2E7D32" newPage>
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#444", marginTop: 0 }}>
                        The Green Index measures vegetation health using the{" "}
                        <strong>Normalized Difference Vegetation Index (NDVI)</strong> and{" "}
                        <strong>Green Area Ratio (GAR)</strong>. Higher values indicate stronger ecological
                        sustainability and vegetation presence across a barangay.
                    </p>

                    {/* Chart placeholder — replace with your real Recharts / Chart.js component */}
                    {greenChart ? (
                        <img
                            src={greenChart}
                            style={{
                                width: "100%",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                margin: "10px 0"
                            }}
                        />
                    ) : (
                        <Placeholder height={200} label="Green Index Chart" />
                    )}

                    <h3 style={{ fontSize: 13, color: "#2E7D32", margin: "16px 0 10px" }}>
                        Barangay Rankings
                    </h3>
                    {greenBarangays.map((b, i) => (
                        <BarangayBar
                            key={b.name}
                            rank={i + 1}
                            name={b.name}
                            score={b.score}
                            label={b.label}
                            barColor="#2E7D32"
                        />
                    ))}

                    <h3 style={{ fontSize: 13, color: "#2E7D32", margin: "16px 0 8px" }}>Insights</h3>
                    {/* TODO: Replace with data-driven insights */}
                    <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 18, color: "#444", margin: 0 }}>
                        <li>Western barangays show stronger vegetation recovery.</li>
                        <li>Urban center areas have lower scores due to dense infrastructure.</li>
                    </ul>
                </Section>

                {/* ── SECTION 5: HAZARD INDEX ANALYSIS ─────────────────────────────── */}
                <Section id="hazard-index" number="05" title="Hazard Index Analysis" accent="#B71C1C" newPage>
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#444", marginTop: 0 }}>
                        The Hazard Index reflects exposure to <strong>flood suscepbtibility</strong>,{" "}
                        <strong>landslide susceptibility</strong>, <strong>weather data</strong>,
                        <strong> earthquake frequency</strong>, <strong>faultline proximity</strong>,
                        <strong> population</strong>, and <strong> infrastructure</strong>. The composite
                        score is computed from weighted sub-indicators sourced from OpenMeteo, U.S. Geological Survey, OpenStreetMap, PSA, and Google Earth Engine.
                    </p>

                    {/* Chart placeholder — replace with your real chart component */}
                    {hazardChart ? (
                        <img src={hazardChart} style={{ width: "100%", borderRadius: 8 }} />
                    ) : (
                        <Placeholder height={200} label="Hazard Index Chart" />
                    )}

                    <h3 style={{ fontSize: 13, color: "#B71C1C", margin: "16px 0 10px" }}>
                        Highest Risk Barangays
                    </h3>
                    {hazardBarangays.map((b, i) => (
                        <BarangayBar
                            key={b.name}
                            rank={i + 1}
                            name={b.name}
                            score={b.score}
                            label={b.label}
                            barColor="#B71C1C"
                        />
                    ))}

                    <h3 style={{ fontSize: 13, color: "#B71C1C", margin: "16px 0 8px" }}>Insights</h3>
                    {/* TODO: Replace with data-driven insights */}
                    <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 18, color: "#444", margin: 0 }}>
                        <li>Flood-prone barangays along river corridors show the highest hazard scores.</li>
                        <li>Hillside areas demonstrate increased landslide susceptibility.</li>
                        <li style={{ color: "#9E9E9E", fontStyle: "italic" }}>
                            — Add more insights from your analysis here —
                        </li>
                    </ul>
                </Section>

                {/* ── SECTION 6: CALAMITY RISK LIKELIHOOD ──────────────────────────── */}
                <Section id="calamity-risk" number="06" title="Calamity Risk Likelihood" accent="#E65100" newPage>
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#444", marginTop: 0 }}>
                        Calamity Risk Likelihood represents the combined probability of disaster impact,
                        considering both hazard exposure and environmental resilience. The score is computed
                        using a <strong>Long Short-Term Memory model</strong> trained on historical
                        calamity occurrence data.
                    </p>

                    {/* Chart placeholder — replace with your real chart component */}
                    {riskChart ? (
                        <img src={riskChart} style={{ width: "100%", borderRadius: 8 }} />
                    ) : (
                        <Placeholder height={200} label="Calamity Risk Chart" />
                    )}

                    <h3 style={{ fontSize: 13, color: "#E65100", margin: "16px 0 10px" }}>
                        Highest Risk Barangays
                    </h3>
                    {calamityBarangays.map((b, i) => (
                        <BarangayBar
                            key={b.name}
                            rank={i + 1}
                            name={b.name}
                            score={b.score}
                            label={b.label}
                            barColor="#E65100"
                        />
                    ))}

                    <h3 style={{ fontSize: 13, color: "#E65100", margin: "16px 0 8px" }}>Insights</h3>
                    {/* TODO: Replace with data-driven insights */}
                    <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 18, color: "#444", margin: 0 }}>
                        <li>Risk clusters appear in western and river-adjacent barangays.</li>
                        <li>Risk is reduced in zones with higher vegetation coverage (Green Index &gt; 65).</li>
                        <li style={{ color: "#9E9E9E", fontStyle: "italic" }}>
                            — Add more insights from your analysis here —
                        </li>
                    </ul>
                </Section>

                {/* ── SECTION 7: CHOROPLETH MAP SNAPSHOT ───────────────────────────── */}
                <Section id="choropleth-map" number="07" title="Choropleth Map Snapshot" accent="#37474F">
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#444", marginTop: 0 }}>
                        The map below shows the spatial distribution of the Hazard Index across all barangays
                        of {cityName} for {year}. Export this image directly from your Leaflet dashboard.
                    </p>

                    {choroMapImageUrl ? (
                        /* Replace placeholder with real exported map image */
                        <img
                            src={choroMapImageUrl}
                            alt={`Choropleth Map – Hazard Index ${year}`}
                            style={{ width: "100%", borderRadius: 8, border: "1px solid #E0E0E0" }}
                        />
                    ) : (
                        <Placeholder
                            height={280}
                            label="Choropleth Map – Hazard Index"
                            hint={`Export your Leaflet map as an image and pass it via the choroMapImageUrl prop, or embed your <MapContainer> component here.`}
                            accent="#37474F"
                        />
                    )}
                    <p style={{ fontSize: 11, color: "#9E9E9E", textAlign: "center", marginTop: 6 }}>
                        Figure: Choropleth Map — Hazard Index by Barangay, {cityName}, {year}
                    </p>
                </Section>

                {/* ── SECTION 8: KEY FINDINGS ───────────────────────────────────────── */}
                <Section id="key-findings" number="08" title="Key Findings" accent="#1565C0">
                    {/*
          TODO: Populate keyFindings from your dashboard's computed insights.
          Each string in the array renders as a bullet.
        */}
                    <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                        {keyFindings.map((finding, i) => (
                            <li
                                key={i}
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "flex-start",
                                    marginBottom: 10,
                                    fontSize: 12,
                                    lineHeight: 1.7,
                                    color: "#333",
                                }}
                            >
                                <span
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: "50%",
                                        background: "#1565C0",
                                        color: "#fff",
                                        fontSize: 10,
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
                </Section>

                {/* ── SECTION 9: RECOMMENDATIONS ───────────────────────────────────── */}
                <Section id="recommendations" number="09" title="Recommendations" accent="#4A148C">
                    {/*
          TODO: Populate recommendations from your analysis or a fixed template.
        */}
                    <ol style={{ paddingLeft: 20, margin: 0 }}>
                        {recommendations.map((rec, i) => (
                            <li
                                key={i}
                                style={{
                                    fontSize: 12,
                                    lineHeight: 1.8,
                                    color: "#333",
                                    marginBottom: 8,
                                    paddingLeft: 4,
                                }}
                            >
                                {rec}
                            </li>
                        ))}
                    </ol>
                </Section>

                {/* ── SECTION 10: METHODOLOGY ──────────────────────────────────────── */}
                {/* <Section id="methodology" number="10" title="Methodology" accent="#00695C">
                    <DataTable
                        headers={["Index", "Formula / Computation", "Data Sources"]}
                        rows={[
                            [
                                "Green Index",
                                "NDVI (60%) + Green Area Ratio (40%) — derived from Sentinel-2 imagery",
                                "ESA Copernicus, LiDAR, LGU land cover maps",
                            ],
                            [
                                "Hazard Index",
                                "Flood Risk (40%) + Landslide Risk (35%) + Seismic Exposure (25%)",
                                "PAGASA, MGB, PHIVOLCS, NAMRIA flood maps",
                            ],
                            [
                                "Calamity Risk Likelihood",
                                "Random Forest classifier trained on 2000–2024 historical calamity data",
                                "NDRRMC, OCD-Calabarzon, LGU records",
                            ],
                        ]}
                        headerBg="#00695C"
                    />

                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#444", marginTop: 16, marginBottom: 0 }}>
                        All indices are computed by the{" "}
                        <strong>Environmental Hazard Monitoring and Prediction System (EHMPS)</strong>. Satellite
                        data is ingested quarterly; machine learning models are retrained annually using updated
                        incident records. Report generation is fully automated through the system dashboard.
                    </p>
                </Section> */}
            </div>

            {/* ── FOOTER ───────────────────────────────────────────────────────── */}
            <div
                style={{
                    borderTop: "2px solid #E0E0E0",
                    paddingTop: 16,
                    textAlign: "center",
                    fontSize: 10,
                    color: "#9E9E9E",
                    lineHeight: 1.6,
                }}
            >
                <strong style={{ color: "#555" }}>
                    HazSpot
                </strong>
                <br />
                {cityName} · Report Year {year} · Generated {displayDate}
                <br />
                This report is automatically generated for planning and academic purposes.
                For emergency response, refer to official government agencies bulletins.
            </div>
        </div >
    );
};

export default EnvironmentalReportTemplate;