import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "./UserDistributionChart.css";

const data = [
  { name: "Citizens", value: 1820 },
  { name: "Researchers", value: 340 },
  { name: "LGU Officers", value: 210 },
];

const COLORS = ["#ea580c", "#fb923c", "#fdba74"];

interface Props {
  small?: boolean;
}

export const UserDistributionChart: React.FC<Props> = ({ small }) => {
  const height = small ? 220 : 320;
  const inner = small ? 45 : 60;
  const outer = small ? 70 : 95;

  return (
    <div className={`chart-card ${small ? "small" : ""}`}>
      <div className="chart-header">
        <h2 className="chart-title">User Distribution</h2>
        <p className="chart-subtitle">By role</p>
      </div>

      <div className="chart-content">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              dataKey="value"
              label={
                small
                  ? false
                  : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
              }
              labelLine={!small}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip />
            <Legend
              verticalAlign="bottom"
              height={small ? 28 : 36}
              wrapperStyle={{ fontSize: small ? 11 : 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
