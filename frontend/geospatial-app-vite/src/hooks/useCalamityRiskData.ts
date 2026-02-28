import { useEffect, useState, useMemo } from "react";
import type { CalamityRiskBarangayData } from "../components/ui/LeafletMap";

export const useCalamityRiskData = (year: number, fetchData: boolean) => {
  const [data, setData] = useState<Record<string, CalamityRiskBarangayData> | null>(null);

  useEffect(() => {
    if (!fetchData) {
      setData(null);
      return;
    }

    let cancelled = false;
    const fetchDataAsync = async () => {
      try {
        let res = await fetch(`/api/hazard/calamity-risk/forecast/?year=${year}`);
        if (!res.ok) res = await fetch(`/api/hazard/calamity-risk/?year=${year}`);
        if (!res.ok) { setData(null); return; }

        const json: { data?: Record<string, CalamityRiskBarangayData> } | null = await res.json();
        if (!cancelled) setData(json?.data ?? null);
      } catch {
        if (!cancelled) setData(null);
      }
    };

    fetchDataAsync();

    return () => { cancelled = true; };
  }, [year, fetchData]);

  const cityAverage = useMemo(() => {
    if (!data) return null;
    const values = Object.values(data).map(d => d.calamity_risk ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [data]);

  return { data, cityAverage };
};
