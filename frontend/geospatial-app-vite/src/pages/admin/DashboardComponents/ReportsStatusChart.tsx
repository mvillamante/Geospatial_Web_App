import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import './ReportStatusCharts.css';

const data = [
  { status: "Pending", value: 127 },
  { status: "In Progress", value: 64 },
  { status: "Resolved", value: 210 },
  { status: "Archived", value: 35 },
];

export const ReportsStatusChart = () => {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#fdba74" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
