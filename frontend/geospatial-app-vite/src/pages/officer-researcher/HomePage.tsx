import React, { useState } from "react";
import "./HomePage.css";

import { GiPlantRoots } from "react-icons/gi";
import { MdWarningAmber, MdLocalFireDepartment  } from "react-icons/md";

// Index Card Component for Indices Section
type IndexCardProps = {
  title: string;
  value: string;
  description: string;
  color: "green" | "orange" | "red";
  icon: React.ReactNode;
};

const IndexCard: React.FC<IndexCardProps> = ({
  title,
  value,
  description,
  color,
  icon,
}) => {
  return (
    <div className={`index-card ${color}`}>
      <div className="background-icon">{icon}</div>

      <div className="index-content">
        <h4>{title}</h4>
        <h2>{value}</h2>
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

  return (
    <div className="home-page">
      {/* Header */}
      <section className="header-card">
        <h1>Environmental Monitoring Overview</h1>
        <p>
          Integrated environmental sustainability and hazard analytics supporting
          researchers and LGU planning, climate adaptation, and disaster risk
          reduction initiatives.
        </p>
      </section>

      {/* Indices */}
      <section className="section">
        <h3 className="section-title">Indices as of {currentYear}</h3>
        <div className="indices-grid">
          <IndexCard
            title="Green Index"
            value={universalGreenAvg != null ? universalGreenAvg.toFixed(1) : "—"}
            description="Environmental resilience indicator"
            color="green"
            icon={<GiPlantRoots />}
          />
          <IndexCard
            title="Hazard Index"
            value={universalHazardAvg != null ? universalHazardAvg.toFixed(1) : "—"}
            description="Multi-factor hazard exposure level"
            color="orange"
            icon={<MdWarningAmber />}
          />
          <IndexCard
            title="Calamity Risk Likelihood"
            value={universalCalamityAvg != null ? universalCalamityAvg.toFixed(1) : "—"}
            description="Derived risk probability score"
            color="red"
            icon={<MdLocalFireDepartment  />}
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
              "NDVI (Normalized Difference Vegetation Index)",
              "Green Area Ratio (GAR)",
            ]}
            variant="green"
          />

          <InfoBox
            title="Hazard Index"
            description="Represents exposure to environmental threats using multi-factor disaster indicators."
            points={[
              "Earthquake Frequency",
              "Flood Susceptibility",
              "Typhoon Intensity",
              "Population Density",
            ]}
            variant="orange"
          />

          <InfoBox
            title="Calamity Risk Likelihood"
            description="Computed from interaction between Hazard Exposure and Environmental Resilience."
            formula="Calamity Risk ≈ α(Hazard Index) − β(Green Index)"
            variant="red"
          />
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
            <img src="/datasource_logos/PAGASA_logo.png" alt="PAGASA" />
            <span>PAGASA</span>
          </div>

          <div className="source">
            <img src="/datasource_logos/PHIVOLCS_logo.png" alt="PHIVOLCS" />
            <span>PHIVOLCS</span> 
          </div>

          <div className="source">
            <img src="/datasource_logos/NAMRIA_logo.png" alt="NAMRIA" />
            <span>NAMRIA</span>
          </div>

          <div className="source">
            <img src="/datasource_logos/OPENMETEO_logo.png" alt="Open Meteo" />
            <span>Open Meteo</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;