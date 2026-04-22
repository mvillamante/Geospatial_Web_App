import { useEffect, useState } from "react";
import { getOfflineReports } from "../services/offlineReportsDB";

export const useofflineReports = () => {
    const [offlineReports, setOfflineReports] = useState<any[]>([]);

    const load = async () => {
        const data = await getOfflineReports();
        setOfflineReports(data);
    };

    useEffect(() => {
        load();

        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    return offlineReports;
}