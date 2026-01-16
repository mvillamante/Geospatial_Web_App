type ReportStatus =
  | "Pending"
  | "Under Review"
  | "Assigned"
  | "In Progress"
  | "Resolved";

interface ProgressBarProps {
  status: ReportStatus;
}

const steps: ReportStatus[] = [
  "Pending",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved"
];

export default function ProgressBar({ status }: ProgressBarProps) {
  const activeIndex = steps.indexOf(status);
  const progress = activeIndex / (steps.length - 1);

  return (

    <div className="progress-bar" style={{ "--progress": progress } as React.CSSProperties}>
      {steps.map((step, index) => (
        <div
          key={step}
          className={`step ${index <= activeIndex ? "active" : ""}`}
        >
          <span />
          <p className="step-label">{step}</p>
        </div>
      ))}
    </div>
  );
}
