import { BookOpen, Bell } from "lucide-react";
import './QuickActions.css';

export function QuickActions() {
    return (
        <div className="quick-actions-card">
            <h2 className="quick-actions-title">Quick Actions</h2>

            <button
                className="quick-action primary"
            >
                <BookOpen className="action-icon" />
                Create Guide
            </button>

            <button
                className="quick-action secondary"
            >
                <Bell className="action-icon" />
                Send Alert
            </button>

        </div>
    )
}