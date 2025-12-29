import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Droplets,
  Mountain,
  Home
} from 'lucide-react';
import "./PrepGuidePage.css";

interface Guide {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  sections: {
    title: string;
    content: string[];
  }[];
}

const guides: Guide[] = [
  {
    id: "flood",
    title: "Flood Preparedness",
    icon: <Droplets className="icon-size" />,
    color: "blue",
    sections: [
      {
        title: "Before a Flood",
        content: [
          "Know your area's flood risk and evacuation routes",
          "Prepare an emergency kit with water, food, medicines, and important documents",
          "Move valuable items to higher floors",
          "Keep mobile phones charged and have a battery-powered radio",
          "Identify multiple evacuation routes from your home and workplace",
        ],
      },
      {
        title: "During a Flood",
        content: [
          "Move to higher ground immediately",
          "Never walk or drive through flood waters - 6 inches can knock you down",
          "Avoid contact with flood water as it may be contaminated",
          "Stay away from power lines and electrical equipment",
          "Listen to emergency broadcasts for updates",
        ],
      },
      {
        title: "After a Flood",
        content: [
          "Return home only when authorities say it's safe",
          "Avoid flood water and standing water",
          "Document property damage with photos",
          "Clean and disinfect everything that got wet",
          "Watch for animals, especially snakes",
        ],
      },
    ],
  },
  {
    id: "earthquake",
    title: "Earthquake Safety",
    icon: <Mountain className="icon-size" />,
    color: "orange",
    sections: [
      {
        title: "Before an Earthquake",
        content: [
          "Identify safe spots in each room (under sturdy tables, against interior walls)",
          "Secure heavy furniture, appliances, and objects that could fall",
          "Know how to turn off gas, water, and electricity",
          "Prepare an emergency kit and family communication plan",
          "Practice earthquake drills with your family",
        ],
      },
      {
        title: "During an Earthquake",
        content: [
          "DROP to your hands and knees immediately",
          "COVER your head and neck under a sturdy table or desk",
          "HOLD ON until the shaking stops",
          "If outdoors, move away from buildings, trees, and power lines",
          "If in a vehicle, pull over safely and stay inside",
        ],
      },
      {
        title: "After an Earthquake",
        content: [
          "Check yourself and others for injuries",
          "Expect aftershocks and be prepared to Drop, Cover, and Hold On",
          "Check for structural damage before re-entering buildings",
          "Turn off utilities if you smell gas or see damage",
          "Stay away from damaged buildings and areas",
        ],
      },
    ],
  },
  {
    id: "evacuation",
    title: "Evacuation Procedures",
    icon: <Home className="icon-size" />,
    color: "red",
    sections: [
      {
        title: "Evacuation Planning",
        content: [
          "Know your local evacuation routes and centers",
          "Plan multiple evacuation routes from your location",
          "Identify meeting points for family members",
          "Keep important documents in a waterproof container",
          "Prepare a 'go bag' with essentials ready at all times",
        ],
      },
      {
        title: "What to Bring",
        content: [
          "Important documents (IDs, birth certificates, property papers)",
          "Water and non-perishable food for 3 days",
          "Medicines and first aid kit",
          "Clothing and personal hygiene items",
          "Mobile phone with charger and power bank",
          "Cash and important contact numbers",
        ],
      },
      {
        title: "During Evacuation",
        content: [
          "Follow instructions from local authorities",
          "Bring your prepared emergency kit",
          "Lock your home but leave it accessible for emergency responders",
          "Turn off utilities (gas, electricity, water) if time permits",
          "Use designated evacuation routes only",
          "Help neighbors who may need assistance",
        ],
      },
      {
        title: "At the Evacuation Center",
        content: [
          "Register immediately upon arrival",
          "Follow center rules and staff instructions",
          "Keep your area clean and organized",
          "Conserve resources (water, electricity, food)",
          "Stay informed through official announcements",
          "Report any medical emergencies to staff",
        ],
      },
    ],
  },
];

function PrepGuidePage() {
  const [expandedGuide, setExpandedGuide] = useState<string | null>("flood");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleGuide = (id: string) => {
    setExpandedGuide(expandedGuide === id ? null : id);
  };

  const toggleSection = (key: string) => {
    setExpandedSections({ ...expandedSections, [key]: !expandedSections[key] });
  };

  return (
    <div className="pg-page">
      <div className="pg-container">
        <div className="pg-header">
          <AlertCircle className="header-icon" />
          <h1>Preparedness Guides</h1>
          <p>Essential information to keep you and your family safe during emergencies</p>
        </div>

        <div className="guides-list">
          {guides.map((guide) => (
            <div key={guide.id} className="guide-card">
              <button className="guide-toggle" onClick={() => toggleGuide(guide.id)}>
                <div className="guide-title-row">
                  <span className={`guide-icon ${guide.color}`}>{guide.icon}</span>
                  <span className="guide-title">{guide.title}</span>
                  {expandedGuide === guide.id ? (
                    <ChevronDown className="chevron" />
                  ) : (
                    <ChevronRight className="chevron" />
                  )}
                </div>
              </button>

              {expandedGuide === guide.id && (
                <div className="sections">
                  {guide.sections.map((section, idx) => {
                    const key = `${guide.id}-${idx}`;
                    const open = expandedSections[key] ?? true;

                    return (
                      <div key={key} className="section-card">
                        <button className="section-toggle" onClick={() => toggleSection(key)}>
                          <h3>{section.title}</h3>
                          {open ? <ChevronDown /> : <ChevronRight />}
                        </button>

                        {open && (
                          <ul className="section-list">
                            {section.content.map((item, i) => (
                              <li key={i}>
                                <span className={`bullet ${guide.color}`}>•</span> {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hotlines">
          <h3>Emergency Hotlines</h3>
          <div className="hotline-grid">
            <p>National Emergency: <strong>911</strong></p>
            <p>NDRRMC: <strong>(02) 911-1406</strong></p>
            <p>Red Cross: <strong>143</strong></p>
            <p>Coast Guard: <strong>(02) 527-8481</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrepGuidePage;

