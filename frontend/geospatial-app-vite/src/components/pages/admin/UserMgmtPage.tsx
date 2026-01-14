import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Power, PowerOff, AlertTriangle, CheckCircle, XCircle, CircleChevronDown, Menu } from 'lucide-react';
import './UserMgmtPage.css';

// const currentUserRole: Role = 'Admin';
const currentUserRole = localStorage.getItem("role") as Role;


type Role = 'Citizen' | 'Researcher' | 'Officer' | 'Admin';
type Status = 'Active' | 'Inactive';
type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  reports: number;
}

interface ResearcherRequest {
  id: number;
  userId: number;
  userName: string;
  date: string;
  status: RequestStatus;
}

// const mockUsers: User[] = [
//   { id: 1, name: 'Juan Cruz', email: 'juan@example.com', phone: '09987654321', role: 'Citizen', status: 'Active', reports: 5 },
//   { id: 2, name: 'Dr. Maria Santos', email: 'maria@example.com', phone: '09111222333', role: 'Citizen', status: 'Active', reports: 0 },
//   { id: 3, name: 'Pedro Reyes', email: 'pedro@example.com', phone: '09876543210', role: 'Citizen', status: 'Active', reports: 2 },
// ];

// const mockRequests: ResearcherRequest[] = [
//   {
//     id: 1,
//     userId: 1,
//     userName: 'Juan Cruz',
//     date: '2025-10-25',
//     status: 'Pending',
//   },
// ];



const UserMgmtPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const res = await fetch("http://127.0.0.1:8000/api/admin/users/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch users");
          return;
        }

        const data = await res.json();

        
        const mappedUsers = data.map((u: any) => ({
          id: u.id,
          name: `${u.username}`,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.is_active ? "Active" : "Inactive",
          reports: u.reports_count ?? 0,
        }));

        setUsers(mappedUsers);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, []);
  
  const reportIncident = (id: number) => {
    setUsers(users.map(u =>
      u.id === id ? { ...u, reports: u.reports + 1 } : u
    ));
  };

  const toggleStatus = (id: number) => {
    setUsers(users.map(u =>
      u.id === id
        ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
        : u
    ));
  };

  const requestResearcher = (user: User) => {
    setRequests([
      ...requests,
      {
        id: requests.length + 1,
        userId: user.id,
        userName: user.name,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
      },
    ]);
  };

  // const updateRole = (id: number, newRole: Role) => {
  //   setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
  // };
  const updateRole = async (id: number, newRole: Role) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/${id}/role/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!res.ok) {
        alert("You are not allowed to change roles");
        return;
      }

      setUsers(users.map(u =>
        u.id === id ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const approveRequest = (id: number) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setUsers(users.map(u =>
      u.id === req.userId ? { ...u, role: 'Researcher' } : u
    ));

    setRequests(requests.map(r =>
      r.id === id ? { ...r, status: 'Approved' } : r
    ));
  };

  const rejectRequest = (id: number) => {
    setRequests(requests.map(r =>
      r.id === id ? { ...r, status: 'Rejected' } : r
    ));
  };

  return (
    <div className="user-page">
      <h1>User Management</h1>

      {/* Tabs */}
      <div className="user-tabs">
        <button className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={tab === 'requests' ? 'tab active' : 'tab'} onClick={() => setTab('requests')}>
          Researcher Requests
          {requests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="request-count">
              {requests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th className="reports-title">Reports</th>
              <th className="right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map(user => {
              const alreadyRequested = requests.some(
                r => r.userId === user.id && r.status === 'Pending'
              );

              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <div className="muted">{user.email}</div>
                    <div className="muted">{user.phone}</div>
                  </td>
                  <td>
                    <div className="role-field">
                    <select
                      className={`role-select ${user.role}`}
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value as Role)}
                      aria-label={`Change role for ${user.name}`}
                      disabled={currentUserRole !== 'Admin'} // Only Admin can change
                    >
                      <option value="Citizen">Citizen</option>
                      <option value="Researcher">Researcher</option>
                      <option value="Officer">Officer</option>
                      <option value="Admin">Admin</option>
                    </select>
                    {currentUserRole !== 'Admin' && (
                      <small className="muted">Only Admin can change roles</small>
                    )}
                      <CircleChevronDown size={13} className="chev" />
                    </div>
                  </td>
                  <td><span className={`badge ${user.status}`}>{user.status}</span></td>
                  <td className="center">{user.reports}</td>

                  <td className="right actions">
                    <div className="action-menu">
                      <button
                        className="menu-button"
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        aria-label={`Open actions for ${user.name}`}
                      >
                        <Menu size={16} />
                      </button>

                      {openMenu === user.id && (
                        <div className="menu-dropdown">
                          {user.role === 'Citizen' && (
                            <button
                              className="menu-item report"
                              onClick={() => { reportIncident(user.id); setOpenMenu(null); }}
                            >
                              <AlertTriangle size={14} /> Report
                            </button>
                          )}

                          {alreadyRequested && (
                            <div className="menu-item disabled">Pending request</div>
                          )}

                          <button
                            className="menu-item"
                            onClick={() => { toggleStatus(user.id); setOpenMenu(null); }}
                          >
                            {user.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />} {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Date</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req => (
              <tr key={req.id}>
                <td>{req.userName}</td>
                <td>{req.date}</td>
                <td>
                  <span className={`badge ${req.status}`}>{req.status}</span>
                </td>
                <td className="right actions">
                  {req.status === 'Pending' && (
                    <>
                      <button className="approve" onClick={() => approveRequest(req.id)}>
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button className="reject" onClick={() => rejectRequest(req.id)}>
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserMgmtPage;

