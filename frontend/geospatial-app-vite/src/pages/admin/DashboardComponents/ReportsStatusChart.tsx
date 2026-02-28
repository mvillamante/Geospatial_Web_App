import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { toast } from "sonner";
import './ReportStatusCharts.css';

type ApiStatus =
    | "pending"
    | "in_progress"
    | "rejected"
    | "resolved"
    | "archived" 
    | string;

type Report = {
    id: number;
    status?: ApiStatus;
};

const API_URL = import.meta.env.VITE_API_URL;

function normalizeStatus(raw: any) {
    const s = String(raw ?? "").toLowerCase();
    if (s === "pending") return "Pending";
    if (s === "in_progress") return "In Progress";
    if (s === "rejected") return "Rejected";
    if (s === "resolved") return "Resolved";
    if (s === "archived") return "Archived";
    return "Pending";
}

const ORDER = ["Pending", "In Progress", "Resolved", "Rejected", "Archived"] as const;

export const ReportsStatusChart: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchReports = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            try {
                setLoading(true);
                const res = await fetch(`${API_URL}/api/reports/list/`, {
                    headers: {Authorization: `Bearer ${token}`},
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `HTTP ${res.status}`);
                }

                const data = await res.json();
                setReports(Array.isArray(data) ? data : []);
            } catch (err: any) {
                console.error(err);
                toast.error(err?.message || "Failed to load reports");
                setReports([]);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const chartData =  useMemo(() => {
        const counts = new Map<string, number>();
        for (const r of reports) {
            const key = normalizeStatus(r.status);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        return ORDER.map((name) => ({
            name,
            value: counts.get(name) ?? 0,
        }));
    }, [reports]);

  return (
    <div className="chart-card">
        <div className="chart-header">
            <p className="chart-subtitle">{loading ? "Loading..." : "Live from reports list"}</p>
        </div>

        <div className="chart-content">
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill='#ea580c' />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};
