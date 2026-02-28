import type { EvacuationCenterData } from "./evacuationCentersTypes";
import { evacuationTypeConfig } from "./evacuationCentersTypes";

export function getEvacuationPopupHTML(
  center: EvacuationCenterData,
  showPopupOnMap: boolean = true
): string {
  if (!showPopupOnMap) return "";
  
  const config = evacuationTypeConfig[center.type];

  return `
    <div class="evac-popup" style="min-width: 260px;">
      <div class="evac-popup-header" style="background: linear-gradient(135deg, ${config.color}, ${config.color}cc); padding: 12px 16px; margin: -13px -16px 12px -16px; border-radius: 4px 4px 0 0;">
        <span style="font-size: 24px; margin-right: 8px;">${config.icon}</span>
        <span style="color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${config.label}</span>
      </div>
      <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 600;">${center.name}</h3>
      <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280;">📍 ${center.address}</p>
      <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${config.bgColor}; border-radius: 8px; margin-bottom: 12px;">
        <span style="font-size: 18px;">👥</span>
        <div>
          <p style="margin: 0; font-size: 11px; color: #6b7280;">Capacity</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${config.color};">${center.capacity} persons</p>
        </div>
      </div>
      <div style="padding: 10px 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${config.color};">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #374151;">🏗️ Facilities:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${center.facilities.map(f => `<span style="display: inline-block; padding: 2px 8px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 10px; color: #4b5563;">${f}</span>`).join('')}
        </div>
      </div>
      <div style="margin-top: 12px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🆘</span>
        <span style="font-size: 11px; color: #047857; font-weight: 500;">Designated Evacuation Site</span>
      </div>
    </div>
  `;
}