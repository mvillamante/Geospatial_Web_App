import { useEffect, useState, useMemo } from "react";
import { fetchHazardIndex } from "../services/hazardService";
import type { HazardBarangayData } from "../types/dashboard.types";

export const useHazardData = (year: number, active: boolean) => {
  const [data, setData] = useState<Record<string, HazardBarangayData> | null>(null);

  useEffect(() => {
    if (!active) {
      setData(null);
      return;
    }

    let cancelled = false;

    fetchHazardIndex(year).then(json => {
      if (!cancelled) {
        setData(json?.data ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [year, active]);

  const cityAverage = useMemo(() => {
    if (!data) return null;
    const values = Object.values(data);
    if (!values.length) return null;

    const sum = values.reduce((a, b) => a + b.hazard_index, 0);
    return sum / values.length;
  }, [data]);

  return { data, cityAverage };
};
