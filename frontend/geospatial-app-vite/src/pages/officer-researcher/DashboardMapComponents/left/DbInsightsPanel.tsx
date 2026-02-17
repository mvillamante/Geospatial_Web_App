import React from "react";
import "../../DashboardMapPage.css";

interface InsightsPanelProps {
  insights: { label: string; description: string }[];
}

const DbInsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {

    const colors2 = ["pink", "coral", "blue"]

    return (
        <div className="panel-card">
            <span className="panel-card-title">Insights</span>
            <div className="columnpanel-card">
                <div>
                    {insights.map((insight, i) => (
                        <div key={i} className={`panel-card left-insight-card ${colors2[i % colors2.length]}`}>
                            <strong>
                                {insight.label}
                            </strong> 
                            {insight.description}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DbInsightsPanel;