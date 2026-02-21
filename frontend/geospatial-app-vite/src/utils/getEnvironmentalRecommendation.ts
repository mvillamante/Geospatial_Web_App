export type RecommendationTone = "green" | "hazard";

export interface EnvironmentalRecommendation {
  title: string;
  text: string;
  tone: RecommendationTone;
}

export const getEnvironmentalRecommendation = (
  greenChangeFromLastYear: number | null,
  hazardChangeFromLastYear: number | null
): EnvironmentalRecommendation => {
  if (
    greenChangeFromLastYear == null ||
    hazardChangeFromLastYear == null
  ) {
    return {
      title: "Insufficient Data",
      text: "Not enough data to generate environmental-hazard outlook.",
      tone: "hazard",
    };
  }

  const getTrend = (value: number) => {
    if (value >= 0.5) return "positive";
    if (value <= -0.5) return "negative";
    return "neutral";
  };

  const greenTrend = getTrend(greenChangeFromLastYear);
  const hazardTrend = getTrend(hazardChangeFromLastYear);

  console.log("Green Trend:", greenTrend, "Hazard Trend:", hazardTrend);

  if (greenTrend === "neutral" && hazardTrend === "neutral") {
    return {
      title: "Stable Environmental-Hazard Balance",
      text: "No significant combined trend detected. Continue monitoring both environmental and hazard indicators.",
      tone: "green",
    };
  }

  if (greenTrend === "positive" && hazardTrend === "positive") {
    return {
      title: "Positive Environmental Impact",
      text: "Environmental improvements may be contributing to reduced hazard exposure. Continue sustainability and mitigation programs.",
      tone: "green",
    };
  }

  if (greenTrend === "negative" && hazardTrend === "negative") {
    return {
      title: "Increasing Vulnerability",
      text: "Environmental degradation and rising hazard exposure indicate increasing vulnerability. Immediate mitigation and ecological recovery actions are recommended.",
      tone: "hazard",
    };
  }

  if (greenTrend === "positive" && hazardTrend === "negative") {
    return {
      title: "Risk Despite Environmental Gains",
      text: "Despite improvements in environmental indicators, hazard exposure is increasing. Review urban density, drainage, and infrastructure resilience.",
      tone: "hazard",
    };
  }

  if (greenTrend === "negative" && hazardTrend === "positive") {
    return {
      title: "Improvement with Environmental Trade-offs",
      text: "Hazard exposure is decreasing, but environmental indicators are weakening. Review sustainability policies.",
      tone: "hazard",
    };
  }

  return {
    title: "Mixed Environmental-Hazard Trend",
    text: "Environmental and hazard indicators show mixed signals. Further analysis is recommended.",
    tone: "hazard",
  };
};