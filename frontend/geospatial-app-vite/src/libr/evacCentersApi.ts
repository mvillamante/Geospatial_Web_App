const API_BASE = "http://localhost:8000/api";

export interface EvacCenterAPI {
  id: number;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  capacity: number;
  address: string;
  contact: string;
  barangay: string;
  facilities: string[];
  coordinates: [number, number];
}
export async function fetchEvacCenters() {
  const res = await fetch(`${API_BASE}/evacuation-centers/`);
  return res.json();
}

export async function createEvacCenter(data: any) {
  const res = await fetch(`${API_BASE}/evacuation-centers/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEvacCenter(id: number, data: any) {
  const res = await fetch(`${API_BASE}/evacuation-centers/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEvacCenter(id: number) {
  await fetch(`${API_BASE}/evacuation-centers/${id}/`, {
    method: "DELETE",
  });
}
