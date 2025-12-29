import { useState } from "react";
import { Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';
// import './CmsPage.css';
import './ReportsMgmtPage.css';


interface Report {
  id: number;
  user: string;
  type: string;
  location: string;
  time: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  description: string;
}

const mockReports: Report[] = [
  {
    id: 1,
    user: 'Juan Cruz',
    type: 'Flood',
    location: 'Barangay Banay-Banay',
    time: '2 hours ago',
    status: 'Pending',
    description: 'Heavy flooding observed near residential area.'
  },
  {
    id: 2,
    user: 'Maria Santos',
    type: 'Landslide',
    location: 'Pulong Sagingan',
    time: '4 hours ago',
    status: 'Verified',
    description: 'Road blockage due to landslide after heavy rain.'
  },
];

const ReportsMgmtPage: React.FC = () => {
  const [reports, setReports] = useState(mockReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const verify = (id: number) => {
    setReports(r => r.map(x => X.id === id ? { ...x, status: 'Verified' } : x));
    toast.success('Report Verified');
  };

  const remove = (id: number) => {
    setReports(r => r.filter(x => X.id !== id));
    toast.success('Report Deleted');
  };

  return (
    <div className="reports-page">
      <h1>Reports Management</h1>

      <div className="card">
        <table className="reports-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Location</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td className="table-id">#{report.id}</td>
                <td>{report.user}</td>
                <td>{report.type}</td>
                <td>{report.location}</td>
                <td>{report.time}</td>
                <td><span className={`badge ${report.status}`}>{report.status}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn">
                      <Eye size={16} />
                    </button>

                    {report.status === 'Pending' && (
                      <> 
                        <button className="icon-btn verify" onClick={() => verify(report.id)}>
                          <Check size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={() => remove(report.id)}>
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsMgmtPage;

