const API_URL = import.meta.env.VITE_API_URL;

export const fetchHazardIndex = async (year: number) => {
  const res = await fetch(`${API_URL}/api/hazard/hazard-index/?year=${year}`);
  if (!res.ok) return null;
  return res.json();
};

export const fetchGreenIndex = async (year: number) => {
  const res = await fetch(`${API_URL}/api/hazard/green-index/?year=${year}`);
  if (!res.ok) return null;
  return res.json();
};

export const fetchCalamityRisk = async (year: number) => {
  let res = await fetch(`${API_URL}/api/hazard/calamity-risk/forecast/?year=${year}`);
  if (!res.ok) {
    res = await fetch(`${API_URL}/api/hazard/calamity-risk/?year=${year}`);
  }
  if (!res.ok) return null;
  return res.json();
};
