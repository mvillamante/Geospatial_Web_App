import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "./UserDistributionChart.css";

const data = [
    { name: "Citizens", value: 1820 },
    { name: "Researchers", value: 340 },
    { name: "LGU Officers", value: 210 }
]

const COLORS = ["#ea580c", "#fb923c", "#fdba74"];

export function UserDistributionChart() {
    return (
        <div className="chart-card">
            <div className="chart-header">
                <h2 className="chart-title">User Distribution</h2>
                <p className="chart-subtitle">By role</p>
            </div>

            <div className="chart-content">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Pie>

                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}