import React from "react";
import "../../DashboardMapPage.css";
import { FiDownload } from "react-icons/fi";
import { HiOutlineDocumentReport, HiOutlineChartBar } from "react-icons/hi";

import type {
  DownloadItem,
  ReportItem,
  // ChartItem,
  ExportItem,
} from "../../../../types/dashboard.types";


interface ExportSection {
  title: string;
  items: ExportItem[];
}

interface ExportSectionProps {
  sections: ExportSection[];
  recentDownloads: DownloadItem[];
  handleDownload: (item: ExportItem, section: string) => void;
}

const DbExportSection: React.FC<ExportSectionProps> = ({
  sections,
  recentDownloads,
  handleDownload,
}) => {

  return (
    <div className="right-panel-content">
      <h4>Export Section</h4>

      {sections.map((section, index) => {
        const itemsToRender =
          section.title === "Recent Downloads"
            ? recentDownloads
            : section.items;

        return (
          <div className="panel-card" key={index}>
            <span className="rightpanel-title">{section.title}</span>

            <ul className="scrollable-export-list">
              {itemsToRender.map((item, i) => {
                const isRecent = section.title === "Recent Downloads";

                // const name = isRecent
                //   ? (item as DownloadItem).name
                //   : Array.isArray(item)
                //   ? (item as ReportItem)[0]
                //   : typeof item === "string"
                //   ? item
                //   : (item as DownloadItem).name;

                return (
                  <li className="export-content" key={i}>
                    {/* LEFT ICON */}
                    <span
                      className={`export-left-icon ${
                        section.title === "Reports"
                          ? "report"
                          : section.title === "Charts"
                          ? "chart"
                          : (item as DownloadItem).type === "report"
                          ? "download-report"
                          : "download-chart"
                      }`}
                    >
                      {section.title === "Reports" ||
                      (isRecent &&
                        (item as DownloadItem).type === "report") ? (
                        <HiOutlineDocumentReport />
                      ) : (
                        <HiOutlineChartBar />
                      )}
                    </span>

                    {/* TEXT */}
                    <div className="export-text">
                      {isRecent ? (
                        <>
                          <span className="export-title">
                            {(item as DownloadItem).name}
                          </span>
                          {(item as DownloadItem).format && (
                            <span className="export-meta">
                              {(item as DownloadItem).format?.toUpperCase()}
                            </span>
                          )}
                        </>
                      ) : Array.isArray(item) ? (
                        <>
                          <span className="export-title">
                            {(item as ReportItem)[0]}
                          </span>
                          <span className="export-meta">
                            {(item as ReportItem)[1]}
                          </span>
                        </>
                      ) : (
                        <span className="export-title">{item as string}</span>
                      )}
                    </div>

                    {/* DOWNLOAD ICON (not for Recent) */}
                    {!isRecent && (
                      <FiDownload
                        className="export-download-icon"
                        onClick={() =>
                          handleDownload(item as ExportItem, section.title)
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default DbExportSection;
