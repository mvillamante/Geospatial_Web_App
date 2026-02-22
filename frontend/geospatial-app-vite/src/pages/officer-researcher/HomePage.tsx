import React from "react";
import "./HomePage.css";

type IndexCardProps = {
  title: string;
  value: string;
  description: string;
  color: "green" | "orange" | "red";
  icon: string;
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
      <div className="index-header">
        <div>
          <h4>{title}</h4>
          <h2>{value}</h2>
        </div>
        <div className="icon">{icon}</div>
      </div>
      <p>{description}</p>
    </div>
  );
};

const HomePage: React.FC = () => {
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
        <h3 className="section-title">Indices as of 2026</h3>
        <div className="indices-grid">
          <IndexCard
            title="Green Index"
            value="86.3"
            description="Environmental resilience indicator"
            color="green"
            icon=""
          />
          <IndexCard
            title="Hazard Index"
            value="38.5"
            description="Multi-factor hazard exposure level"
            color="orange"
            icon=""
          />
          <IndexCard
            title="Calamity Risk Likelihood"
            value="39.9"
            description="Derived risk probability score"
            color="red"
            icon=""
          />
        </div>
      </section>

      {/* Understanding Section */}
      <section className="section info-card">
        <h3 className="section-title">Understanding the Indices</h3>

        <div className="info-grid">
          <div>
            <h4 className="green-text">Green Index</h4>
            <p>
              Evaluates environmental sustainability and vegetation health using
              satellite-derived land-use indicators.
            </p>
            <ul>
              <li>NDVI (Normalized Difference Vegetation Index)</li>
              <li>Green Area Ratio (GAR)</li>
            </ul>
          </div>

          <div>
            <h4 className="orange-text">Hazard Index</h4>
            <p>
              Represents exposure to environmental threats using multi-factor
              disaster indicators.
            </p>
            <ul>
              <li>Earthquake Frequency</li>
              <li>Flood Susceptibility</li>
              <li>Typhoon Intensity</li>
              <li>Population Density</li>
            </ul>
          </div>

          <div>
            <h4 className="red-text">Calamity Risk Likelihood</h4>
            <p>
              Computed from interaction between Hazard Exposure and Environmental
              Resilience.
            </p>
            <p className="formula">
              Calamity Risk ≈ α(Hazard Index) − β(Green Index)
            </p>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="section">
        <h3 className="section-title">Data Sources</h3>
        <p className="data-description">
          Integrated datasets from national agencies and trusted open-data
          platforms to ensure reliability and policy alignment.
        </p>

        <div className="sources-grid">
          <div className="source">PAGASA</div>
          <div className="source">PHIVOLCS</div>
          <div className="source">NAMRIA</div>
          <div className="source">Open Meteo</div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;