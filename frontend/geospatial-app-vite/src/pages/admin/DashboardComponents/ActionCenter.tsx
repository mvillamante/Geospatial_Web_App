import { useNavigate } from "react-router-dom"
import "../DashboardPage.css";

export const ActionCenter: React.FC = () => {
    const navigate = useNavigate();

    const actions = [
        {
            title: "Review pending reports",
            desc: "Check new incident reports that need action.",
            onClick: () => navigate("/main/admin/manage-reports?status=Pending&tab=active"),
            btn: "Open",
        },
        {
            title: "Assign officers",
            desc: "Assign / reassign officers to active reports.",
            onClick: () => navigate("/main/admin/manage-reports?tab=active"),
            btn: "Go",
        },
        {
            title: "View archived reports",
            desc: "Review past reports and history.",
            onClick: () => navigate("/main/admin/manage-reports?tab=archived"),
            btn: "View",
        },
        {
            title: "Manage users",
            desc: "Create staff accounts, toggle status, roles.",
            onClick: () => navigate("/main/admin/manage-user"),
            btn: "Manage",
        },
        {
            title: "Manage community feed",
            desc: "Create / edit posts and publish updates.",
            onClick: () => navigate("/main/admin/cms"),
            btn: "Open",
        }
    ];

    return (
        <div className="panel action-center">
            <div className="panel-head">
                <div className="panel-title">Action Center</div>
            </div>

            <div className="action-list">
                {actions.map((a) => (
                    <div key={a.title} className="action-item">
                        <div className="action-title">{a.title}</div>
                        <div className="action-sub">{a.desc}</div>
                        <button className="action-btn" onClick={a.onClick} type="button">
                            {a.btn}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}