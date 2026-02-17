// UniversalIndexData.ts
import { useState, useEffect, useMemo } from "react";
import type { HazardBarangayData, GreenIndexBarangayData, CalamityRiskBarangayData } from "../components/ui/LeafletMap";

interface UniversalIndexData {
  year: number;
  // Current year data
  hazardData: Record<string, HazardBarangayData> | null;
  greenData: Record<string, GreenIndexBarangayData> | null;
  calamityData: Record<string, CalamityRiskBarangayData> | null;

  // Previous year data (for year-over-year change)
  prevHazardData: Record<string, HazardBarangayData> | null;
  prevGreenData: Record<string, GreenIndexBarangayData> | null;

  // Universal averages
  universalHazardAvg: number | null;
  universalGreenAvg: number | null;
  universalCalamityAvg: number | null;

  // Year-over-year change
  hazardChangeFromLastYear: number | null;
  greenChangeFromLastYear: number | null;
}

export const useUniversalIndexData = (year: number): UniversalIndexData => {
  const [hazardData, setHazardData] = useState<Record<string, HazardBarangayData> | null>(null);
  const [greenData, setGreenData] = useState<Record<string, GreenIndexBarangayData> | null>(null);
  const [calamityData, setCalamityData] = useState<Record<string, CalamityRiskBarangayData> | null>(null);

  const [prevHazardData, setPrevHazardData] = useState<Record<string, HazardBarangayData> | null>(null);
  const [prevGreenData, setPrevGreenData] = useState<Record<string, GreenIndexBarangayData> | null>(null);

  // Fetch current year data
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [greenRes, hazardRes] = await Promise.all([
          fetch(`/api/hazard/green-index/?year=${year}`),
          fetch(`/api/hazard/hazard-index/?year=${year}`),
        ]);

        let calamityRes = await fetch(`/api/hazard/calamity-risk/forecast/?year=${year}`);
        if (!calamityRes.ok) calamityRes = await fetch(`/api/hazard/calamity-risk/?year=${year}`);

        if (cancelled) return;

        const greenJson = greenRes.ok ? await greenRes.json() : null;
        const hazardJson = hazardRes.ok ? await hazardRes.json() : null;
        const calamityJson = calamityRes.ok ? await calamityRes.json() : null;

        setGreenData(greenJson?.data ?? null);
        setHazardData(hazardJson?.data ?? null);
        setCalamityData(calamityJson?.data ?? null);
      } catch {
        if (!cancelled) {
          setGreenData(null);
          setHazardData(null);
          setCalamityData(null);
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [year]);

  // Fetch previous year data for year-over-year
  useEffect(() => {
    const prevYear = year - 1;
    if (prevYear < 2000) { setPrevGreenData(null); setPrevHazardData(null); return; }
    let cancelled = false;

    const fetchPrev = async () => {
      try {
        const [greenRes, hazardRes] = await Promise.all([
          fetch(`/api/hazard/green-index/?year=${prevYear}`),
          fetch(`/api/hazard/hazard-index/?year=${prevYear}`),
        ]);
        if (cancelled) return;

        const greenJson = greenRes.ok ? await greenRes.json() : null;
        const hazardJson = hazardRes.ok ? await hazardRes.json() : null;

        setPrevGreenData(greenJson?.data ?? null);
        setPrevHazardData(hazardJson?.data ?? null);
      } catch {
        if (!cancelled) {
          setPrevGreenData(null);
          setPrevHazardData(null);
        }
      }
    };

    fetchPrev();
    return () => { cancelled = true; };
  }, [year]);

  // Universal averages
  const universalGreenAvg = useMemo(() => {
    if (!greenData) return null;
    const values = Object.values(greenData).map(d => d.green_index ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [greenData]);

  const universalHazardAvg = useMemo(() => {
    if (!hazardData) return null;
    const values = Object.values(hazardData).map(d => d.hazard_index ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [hazardData]);

  const universalCalamityAvg = useMemo(() => {
    if (!calamityData) return null;
    const values = Object.values(calamityData).map(d => d.calamity_risk ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [calamityData]);

  // Year-over-year changes
  const greenChangeFromLastYear = universalGreenAvg != null && prevGreenData
    ? universalGreenAvg - (Object.values(prevGreenData).reduce((a, b) => a + (b.green_index ?? 0), 0) / Object.values(prevGreenData).length)
    : null;

  const hazardChangeFromLastYear = universalHazardAvg != null && prevHazardData
    ? universalHazardAvg - (Object.values(prevHazardData).reduce((a, b) => a + (b.hazard_index ?? 0), 0) / Object.values(prevHazardData).length)
    : null;

  return {
    year,
    hazardData,
    greenData,
    calamityData,
    prevHazardData,
    prevGreenData,
    universalHazardAvg,
    universalGreenAvg,
    universalCalamityAvg,
    hazardChangeFromLastYear,
    greenChangeFromLastYear,
  };
};
