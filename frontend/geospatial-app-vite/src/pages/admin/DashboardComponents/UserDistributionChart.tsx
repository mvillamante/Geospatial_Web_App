import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "./UserDistributionChart.css";
// import { PieLabelRenderProps } from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  role: string | null;
  extra_roles?: string[];
}

interface Props {
  small?: boolean;
}

export const UserDistributionChart: React.FC<Props> = ({ small }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `${API_URL}/api/admin/users/distribution/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json()

        const mappedUsers: User[] = data.map((u: any) => ({
          username: u.username,
          role: u.role ?? null,
          extra_roles: u.extra_roles ?? [],
        }));

        setUsers(mappedUsers);
        console.log("")
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Count roles safely
  const researchersCount = users.filter(u =>
    u.extra_roles?.some(r => r?.toLowerCase() === "researcher")
  ).length;

  const officersCount = users.filter(u =>
    u.role?.toLowerCase() === "officer"
  ).length;

  const citizensCount = users.filter(u =>
    u.role?.toLowerCase() === "citizen"
  ).length;

  const data = [
    { name: "Citizens", value: citizensCount },
    { name: "Researchers", value: researchersCount },
    { name: "LGU Officers", value: officersCount },
  ];

  const COLORS = ["#ea580c", "#fb923c", "#fdba74"];
  const height = small ? 220 : 320;
  const inner = small ? 45 : 60;
  const outer = small ? 70 : 95;

  const totalUsers = users.length;

  if (loading) return <p>Loading chart...</p>;

  return (
    <div className={`chart-card ${small ? "small" : ""}`}>
      <div className="chart-header">
        <p className="chart-subtitle">By role</p>
      </div>

      <div className="chart-content">
        <ResponsiveContainer>
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
                  : ({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={!small}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: small ? 14 : 18, fontWeight: "bold" }}
              >
                {totalUsers} Users
              </text>

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
