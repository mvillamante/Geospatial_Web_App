import type { EvacuationCenterData } from "./evacuationCentersTypes";

interface Props {
  center: EvacuationCenterData | null;
}

export default function SelectedEvacuationCenter({ center }: Props) {
  if (!center) return <div className="selected-evac-card">No center selected</div>;

  return (
    <div className="selected-evac-card" dangerouslySetInnerHTML={{ __html: `
      <h3>${center.name}</h3>
      <p>${center.address}</p>
      <p>Capacity: ${center.capacity}</p>
      <p>Facilities: ${center.facilities.join(", ")}</p>
    `}} />
  );
}
