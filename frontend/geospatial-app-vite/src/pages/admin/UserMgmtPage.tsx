import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Power, PowerOff, AlertTriangle, CheckCircle, XCircle, CircleChevronDown } from 'lucide-react';
import { LuEllipsis } from "react-icons/lu";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
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
  dateJoined: string;
  lastLogin: string;
}

interface ResearcherRequest {
  id: number;
  userId: number;
  userName: string;
  date: string;
  status: RequestStatus;
}

const UserMgmtPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"dateJoined" | "lastLogin" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const filteredUsers = users.filter(user => {
    const roleMatch =
      roleFilter === 'All' || user.role === roleFilter;

    const statusMatch =
      statusFilter === 'All' || user.status === statusFilter;

    const searchMatch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase());

    return roleMatch && statusMatch && searchMatch;
  });

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
          dateJoined: u.date_joined,
          lastLogin: u.last_login ?? "Never",
        }));

        setUsers(mappedUsers);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("http://127.0.0.1:8000/api/admin/researcher_requests/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch requests");
          return;
        }

        const data = await res.json();
        console.log("Fetched requests:", data);

        // Map backend data to frontend interface
        const mappedRequests = data.map((r: any) => ({
          id: r.id,
          userId: r.user,
          userName: r.username,
          date: r.requested_at.split('T')[0],
          status: r.status as RequestStatus,
        }));

        console.log("Mapped requests:", mappedRequests);

        setRequests(mappedRequests);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
    fetchRequests();
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
        const err = await res.json();
        alert(err.detail || "You are not allowed to change roles");
        return;
      }

      // update UI after success
      setUsers(users.map(u =>
        u.id === id ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      console.error("Role update failed:", err);
    }
  };

  const approveRequest = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/researcher/request/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to approve request");
        return;
      }

      const updatedReq = await res.json();

      setRequests(requests.map(r => r.id === id ? { ...r, status: updatedReq.status } : r));

      setUsers(users.map(u =>
        u.id === updatedReq.user.id ? { ...u, role: "Researcher" } : u
      ));
    } catch (err) {
      console.error("Approve request failed:", err);
    }
  };

  const rejectRequest = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/researcher/request/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to reject request");
        return;
      }

      const updatedReq = await res.json();

      setRequests(requests.map(r => r.id === id ? { ...r, status: updatedReq.status } : r));
    } catch (err) {
      console.error("Reject request failed:", err);
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;

    const aVal = new Date(a[sortField]);
    const bVal = new Date(b[sortField]);

    return sortOrder === "asc" ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
  });


  const handleSortClick = (field: "dateJoined" | "lastLogin") => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") setSortOrder(null);
      else setSortOrder("asc");
    }
  };

  return (
    <div className="user-page">
      <h1>User Management</h1>
      <div className="filters">
        {/* Search by Name */}
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'All')}
        >
          <option value="All">All Roles</option>
          <option value="Researcher">Researcher</option>
          <option value="Officer">Officer</option>
          <option value="Admin">Admin</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

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
              <th></th>
              <th >User</th>
              <th className="center">Role</th>
              <th className="center">Status</th>
              <th className="center">
                <span className="sort-header" onClick={() => handleSortClick("dateJoined")}>
                  Date Joined
                  {sortField === "dateJoined" ? 
                    (sortOrder === "asc" ? <HiChevronUp /> :
                    sortOrder === "desc" ? <HiChevronDown /> :
                    <HiChevronUpDown />) : <HiChevronUpDown />
                  }
                </span>
              </th>
              <th className="center">
                <span className="sort-header" onClick={() => handleSortClick("lastLogin")}>
                  Last Login
                  {sortField === "lastLogin" ? 
                    (sortOrder === "asc" ? <HiChevronUp /> :
                    sortOrder === "desc" ? <HiChevronDown /> :
                    <HiChevronUpDown />) : <HiChevronUpDown />
                  }
                </span>
              </th>
              <th className="center">Actions</th>
            </tr>
          </thead>

          <tbody className="user-table-body">
            {sortedUsers.map((user, index) => {
              const alreadyRequested = requests.some(
                r => r.userId === user.id && r.status === 'Pending'
              );

              return (
                <tr key={user.id}>
                  <td className="cell-number">{index+1}</td>
                  <td>
                    <div className={`user-details role-${user.role.toLowerCase()}`}>
                      <strong className="user-name">{user.name}</strong>
                    </div>
                    {/* <div className="muted">{user.email}</div>
                    <div className="muted">{user.phone}</div> */}
                  </td>
                  <td className="center">
                    <div className="role-cell">
                      <div className="role-field">
                        <select
                          className={`role-select ${user.role}`}
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value as Role)}
                          aria-label={`Change role for ${user.name}`}
                          disabled={currentUserRole !== 'Admin'}
                        >
                          <option value="Citizen">Citizen</option>
                          <option value="Researcher">Researcher</option>
                          <option value="Officer">Officer</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <CircleChevronDown size={13} className="chev" />
                      </div>

                      {currentUserRole !== 'Admin' && (
                        <span className="role-hint">Admin only</span>
                      )}
                    </div>
                  </td>
                  <td className="center"><span className={`badge ${user.status}`}>{user.status}</span></td>
                  <td className="center muted">{user.dateJoined}</td>
                  <td className="center muted">{user.lastLogin}</td>
                  <td className="right actions">
                    <div className="action-menu">
                      <button
                        className="menu-button"
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        aria-label={`Open actions for ${user.name}`}
                      >
                        <LuEllipsis size={20} />
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
              <th></th>
              <th>User</th>
              <th className="center">Date</th>
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, index) => (
              <tr key={req.id}>
                <td className="cell-number">{index+1}</td>
                <td className="user-name">{req.userName}</td>
                <td className="center muted">{req.date}</td>
                <td className="center">
                  <span className={`badge ${req.status}`}>{req.status}</span>
                </td>
                <td className="center actions">
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserMgmtPage;

