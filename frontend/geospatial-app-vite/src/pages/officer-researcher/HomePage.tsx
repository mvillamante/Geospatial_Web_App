import React, { useState } from "react";
import "./HomePage.css";

import { GiPlantRoots } from "react-icons/gi";
import { MdWarningAmber, MdLocalFireDepartment } from "react-icons/md";

type TrendType = {
  direction: "up" | "down" | "same";
  isImprovement: boolean;
  percent: string;
} | null;

type IndexCardProps = {
  title: string;
  value: string;
  description: string;
  color: "green" | "orange" | "red";
  icon: React.ReactNode;
  trend?: TrendType;
};

const IndexCard: React.FC<IndexCardProps> = ({
  title,
  value,
  description,
  color,
  icon,
  trend,
}) => {
  return (
    <div className={`index-card ${color}`}>
      <div className="background-icon">{icon}</div>

      <div className="index-content">
        <h4>{title}</h4>
        <h2>{value}</h2>

        {trend && trend.direction !== "same" && (
          <div
            className={`trend ${trend.isImprovement ? "good" : "bad"
              }`}
          >
            {trend.direction === "up" ? "▲" : "▼"} {trend.percent}%
            <span> vs last year</span>
          </div>
        )}
        <p>{description}</p>
      </div>
    </div>
  );
};

// Info Box Component for Understanding Section
type InfoBoxProps = {
  title: string;
  description: string;
  points?: string[];
  formula?: string;
  variant: "green" | "orange" | "red";
};

const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  description,
  points,
  formula,
  variant,
}) => {
  return (
    <div className={`info-box ${variant}`}>
      <h4>{title}</h4>
      <p>{description}</p>

      {points && (
        <div className="info-points">
          {points?.map((point, index) => (
            <span key={index} className={`info-point-item ${variant}`}>
              {point}
            </span>
          ))}
        </div>
      )}

      {formula && (
        <div className={`formula ${variant}`}>
          {formula}
        </div>
      )}
    </div>
  );
};

import { useUniversalIndexData } from "../../hooks/useUniversalIndexData";

const HomePage: React.FC = () => {

  /*---------- Time ----------*/
  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  const maxYear = 2030;
  const initialYear = Math.min(maxYear, Math.max(minYear, currentYear));
  const [year, setYear] = useState(initialYear);

  const {
    universalGreenAvg,
    universalHazardAvg,
    universalCalamityAvg,
  } = useUniversalIndexData(year);

  const previousYear = year > minYear ? year - 1 : null;
  const hasPreviousYear = year > minYear;

  const {
    universalGreenAvg: prevGreen,
    universalHazardAvg: prevHazard,
    universalCalamityAvg: prevCalamity,
  } = useUniversalIndexData(previousYear ?? year);

  const getTrend = (
    current: number | null,
    previous: number | null,
    higherIsBetter: boolean
  ): TrendType => {
    if (current == null || previous == null || previous === 0) return null;

    const diff = current - previous;
    const percent = ((Math.abs(diff) / previous) * 100).toFixed(1);

    if (diff === 0) {
      return {
        direction: "same",
        isImprovement: false,
        percent: "0",
      };
    }

    const isImprovement = higherIsBetter ? diff > 0 : diff < 0;

    return {
      direction: diff > 0 ? "up" : "down",
      isImprovement,
      percent,
    };
  };

  return (
    <div className="home-page">
      {/* Header */}
      {/* ===== HEADER ===== */}
      <section className="home-header">
        <div>
          <h1>Geospatial Data Analytics Overview</h1>
          <p>Environmental, Hazard &  Calamity Risk — {year}</p>
        </div>

        <div className="year-filter">
          <label>Select Year:</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
              const y = minYear + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
      </section>

      {/* Indices */}
      <section className="section">
        <h3 className="section-title">Indices as of {year}</h3>
        <div className="indices-grid">
          <IndexCard
            title="Green Index"
            value={universalGreenAvg?.toFixed(1) ?? "—"}
            description="Environmental resilience indicator"
            color="green"
            icon={<GiPlantRoots />}
            trend={hasPreviousYear ? getTrend(universalGreenAvg, prevGreen, true) : null}
          />

          <IndexCard
            title="Hazard Index"
            value={universalHazardAvg?.toFixed(1) ?? "—"}
            description="Multi-factor hazard exposure level"
            color="orange"
            icon={<MdWarningAmber />}
            trend={hasPreviousYear ? getTrend(universalHazardAvg, prevHazard, false) : null}
          />

          <IndexCard
            title="Calamity Risk Likelihood"
            value={universalCalamityAvg?.toFixed(1) ?? "—"}
            description="Derived risk probability score"
            color="red"
            icon={<MdLocalFireDepartment />}
            trend={hasPreviousYear ? getTrend(universalCalamityAvg, prevCalamity, false) : null}
          />
        </div>
      </section>

      {/* Understanding Section */}
      <section className="section info-card">
        <h3 className="section-title">Understanding the Indices</h3>

        <div className="info-row">
          <InfoBox
            title="Green Index"
            description="Evaluates environmental sustainability and vegetation health using satellite-derived land-use indicators."
            points={[
              "NDVI – Vegetation density indicator",
              "GAR – Green Area Ratio",
              "w – indicator weight",
            ]}
            formula="GI = w1 × NDVI_norm + w2 × GAR_norm"
            variant="green"
          />

          <InfoBox
            title="Hazard Index"
            description="Represents exposure to environmental threats using multi-factor disaster indicators."
            points={[
              "E – Earthquake Frequency",
              "L – Landslide Frequency",
              "F – Flood Susceptibility",
              "Fa – Faultline Proximity",
              "T – Typhoon Frequency and Intensity",
              "P – Population Density",
              "I – Infrastructure Exposure",
              "w – factor weight",
            ]}
            formula="HI = w1E + w2L + w3F + w4Fa + w5T + w6P + w7I"
            variant="orange"
          />

          <InfoBox
            title="Calamity Risk Likelihood"
            description="Computed from interaction between Hazard Exposure and Environmental Resilience."
            points={[
              "H_norm – Normalized Hazard Index",
              "E_norm – Exposure indicator",
              "GI_norm – Normalized Green Index",
            ]}
            formula="CRL(i,t) = (H_norm(i,t) × E_norm(i,t)) * (1 - GI_norm(i,t))"
            variant="red"
          />
        </div>
      </section>

      <section className="section">
        <div className="sdg-container">

          <div className="sdg-box sdg-11">
            <div className="sdg-icon">11</div>
            <div className="sdg-content">
              <h4>Sustainable Cities and Communities</h4>
              <p>Target 11.5: Reduce the number of people affected by disasters.</p>
            </div>
          </div>

          <div className="sdg-box sdg-13">
            <div className="sdg-icon">13</div>
            <div className="sdg-content">
              <h4>Climate Action</h4>
              <p>Target 13.1: Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Data Sources */}
      <section className="section data-sources">
        <h3 className="section-title">Data Sources</h3>
        <p className="data-description">
          Integrated datasets from national agencies and trusted open-data
          platforms to ensure reliability and policy alignment.
        </p>

        <div className="sources-grid">
          <div className="source">
            <img src="/datasource_logos/copernicus.png" alt="COPERNICUS" />
            <span>Copernicus</span>
          </div>

          <div className="source">
            <img src="/datasource_logos/gee.png" alt="Google Earth Engine" />
            <span>Google Earth Engine</span>
          </div>

          <div className="source">
            <img src="/datasource_logos/openstreetmap.png" alt="OpenStreetMap" />
            <span>OpenStreetMap</span>
          </div>

          <div className="source">
            <img src="/datasource_logos/openmeteo.png" alt="Open Meteo" />
            <span>Open Meteo</span>
          </div>
          <div className="source">
            <img src="/datasource_logos/psa.jpeg" alt="PSA" />
            <span>PSA</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;