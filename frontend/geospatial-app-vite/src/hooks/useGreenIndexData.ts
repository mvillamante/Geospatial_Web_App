import { useEffect, useState, useMemo } from "react";
import type { GreenIndexBarangayData } from "../components/ui/LeafletMap";

export const useGreenIndexData = (year: number, fetchData: boolean) => {
  const [data, setData] = useState<Record<string, GreenIndexBarangayData> | null>(null);

  useEffect(() => {
    if (!fetchData) {
      setData(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/hazard/green-index/?year=${year}`)
      .then(res => (res.ok ? res.json() : null))
      .then((json: { data?: Record<string, GreenIndexBarangayData> } | null) => {
        if (cancelled) return;
        setData(json?.data ?? null);
      })
      .catch(() => !cancelled && setData(null));

    return () => { cancelled = true; };
  }, [year, fetchData]);

  const cityAverage = useMemo(() => {
    if (!data) return null;
    const values = Object.values(data).map(d => d.green_index ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [data]);

  return { data, cityAverage };
};
