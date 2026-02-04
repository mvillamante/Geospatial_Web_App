import './UserMgmtPage.css';
import { useEffect, useRef, useState, useCallback  } from "react";
import { Power, PowerOff, CircleChevronDown } from 'lucide-react';
import { LuEllipsis } from "react-icons/lu";
import { FaUserSlash } from "react-icons/fa";
import { FiSearch, FiPlus, FiUser, FiCheckCircle } from "react-icons/fi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { getUserRoleAndDisplayName } from "../../libr/auth";

import ResearcherRequestsTab, { type ResearcherRequest } from "../../components/ui/ResearcherRequestsTab";
import CreateUserModal from '../../components/ui/Modals/CreateUserModal';

type Role = 'Researcher' | 'Officer' | 'Admin';
type Status = 'Active' | 'Inactive';

interface User {
  id: number;
  staff_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: Status;
  extra_roles?: string[];
  department?: string;
  dateJoined: string;
  lastLogin: string;
  lastLoginDisplay: string;
}

interface BackendUser {
  id: number;
  staff_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  extra_roles?: string[];
  department?: string;
  is_active: boolean;
  date_joined_display: string;
  last_login?: string;
  last_login_display?: string;
}

const UserMgmtPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allRequests, setAllRequests] = useState<ResearcherRequest[]>([]);

  const pageSize = 10;
  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"dateJoined" | "lastLogin" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [pendingCount, setPendingCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const { userRole } = getUserRoleAndDisplayName();

  /* FETCH USERS */
  const fetchUsers = useCallback(async (page = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();

      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (roleFilter !== "All") params.append("role", roleFilter.toLowerCase());
      if (statusFilter !== "All") params.append("status", statusFilter.toLowerCase());
      if (debouncedSearch) params.append("search", debouncedSearch);

      if (sortField) {
        params.append(
          "ordering",
          sortField === "dateJoined"
            ? sortOrder === "desc" ? "-date_joined" : "date_joined"
            : sortOrder === "desc" ? "-last_login" : "last_login"
        );
      }

      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      console.log("raw data", data)

      const mappedUsers: User[] = data.results.map((u: BackendUser) => ({
        id: u.id,
        staff_id: u.staff_id,
        username: u.username,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        phone: u.phone,
        role: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "",
        extra_roles: u.extra_roles ?? [],
        department: u.department ?? "---",
        status: u.is_active ? "Active" : "Inactive",
        dateJoined: u.date_joined_display,
        lastLogin: u.last_login ?? "",
        lastLoginDisplay: u.last_login_display ?? "Never",
      }));

      setUsers(mappedUsers);
      console.log("eto map", mappedUsers);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [roleFilter, statusFilter, debouncedSearch, sortField, sortOrder, pageSize]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  /* FETCH RESEARCHER REQUESTS HIDDEN ON MOUNT */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/?page=1&page_size=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data = await res.json();

        setAllRequests(data.results);
        setPendingCount(data.results.filter((r: any) => r.status === "Pending").length);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  /* SORTING */
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

  /* PAGINATION */
  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages === 0) return null;
    return (
      <div className="pagination">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onPageChange(n)} className={n === currentPage ? "active" : ""}>{n}</button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    );
  };
  const handlePageChange = (page: number) => { if (page < 1 || page > totalPages) return; fetchUsers(page); };

  /* USER ACTIONS */
  const toggleStatus = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/toggle-status/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return alert("Failed to toggle status");

      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
    } catch (err) { console.error(err); }
  };

  const updateRole = async (id: number, newRole: Role) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/role/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole.toLowerCase() }),
      });
      if (!res.ok) return alert("Failed to update role");

      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      fetchUsers(currentPage);
    } catch (err) { console.error(err); }
  };

  const revokeResearcher = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/revoke-researcher/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed");
      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      fetchUsers(currentPage);
    } catch (err) { console.error(err); }
  };

  /* TABS */
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const activeIdx = tab === "users" ? 0 : 1;
    const activeTab = tabRefs.current[activeIdx];
    if (activeTab) setUnderlineStyle({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
  }, [tab, pendingCount]);

  return (
    <div className="user-page">
      <h1>User Management</h1>

      {/* Tabs */}
      <div className="user-tabs" ref={tabsRef}>
        <button ref={el => { tabRefs.current[0] = el; }} onClick={() => setTab('users')} className={tab === 'users' ? 'tab active' : 'tab'}>Users</button>
        <button ref={el => { tabRefs.current[1] = el; }} onClick={() => setTab('requests')} className={tab === 'requests' ? 'tab active' : 'tab'}>
          Researcher Requests
          {pendingCount > 0 && <span className="request-count">{pendingCount}</span>}
        </button>
        <span className="tab-underline" style={{ left: underlineStyle.left, width: underlineStyle.width }} />
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          {/* Filters + Search + Create User */}
          <div className="filters">
            <div className="filters-left">
              <div className="select-wrapper">
                <FiUser className="select-icon" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | 'All')} className="role-select">
                  <option value="All">All Roles</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Officer">Officer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="select-wrapper">
                <FiCheckCircle className="select-icon" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'All')} className="status-select">
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="filters-right">
              <div className="search-wrapper">
                <FiSearch className="search-icon" />
                <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              </div>
              <button className="create-user-btn" onClick={() => setShowCreateModal(true)}>
                <FiPlus size={16} /> Create User
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="user-table-wrapper">
            {loading && <div className="table-loading-overlay" />}
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="center">Staff ID</th>
                  <th className="center">User</th>
                  <th className="center">Role</th>
                  <th className="center">Department</th>
                  <th className="center">Status</th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("dateJoined")}>
                      Date Joined
                      {sortField === "dateJoined" ? (sortOrder === "asc" ? <HiChevronUp /> : sortOrder === "desc" ? <HiChevronDown /> : <HiChevronUpDown />) : <HiChevronUpDown />}
                    </span>
                  </th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("lastLogin")}>
                      Last Login
                      {sortField === "lastLogin" ? (sortOrder === "asc" ? <HiChevronUp /> : sortOrder === "desc" ? <HiChevronDown /> : <HiChevronUpDown />) : <HiChevronUpDown />}
                    </span>
                  </th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody className="user-table-body">
                {users.map((user, index) => {
                  const alreadyRequested = allRequests.some(r => r.userId === user.id && r.status === "Pending");
                  const displayRole = user.extra_roles?.some(r => r.toLowerCase() === "researcher") ? "Researcher" : user.role;
                  const roleClass = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);

                  return (
                    <tr key={user.id}>
                      <td className="cell-number">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="center staff-id">{user.staff_id}</td>
                      <td>
                        <div className={`user-details role-${roleClass}`}><strong className="user-name">{user.name}</strong></div>
                      </td>
                      <td className="center">
                        <div className="role-cell">
                          <div className="role-field">
                            <select className={`role-select ${displayRole}`} value={displayRole} onChange={(e) => updateRole(user.id, e.target.value as Role)} aria-label={`Change role for ${user.name}`} disabled={userRole !== 'Admin' || user.role?.toLowerCase() === 'citizen' || (user.role?.toLowerCase() === 'citizen' && user.extra_roles?.some(r => r.toLowerCase() === 'researcher'))}>
                              <option value="Researcher">Researcher</option>
                              <option value="Officer">Officer</option>
                              <option value="Admin">Admin</option>
                            </select>
                            {!((user.role?.toLowerCase() === 'citizen') || (user.role?.toLowerCase() === "citizen" && user.extra_roles?.some(r => r.toLowerCase() === "researcher"))) && <CircleChevronDown size={13} className="chev" />}
                          </div>
                          {userRole !== 'Admin' && <span className="role-hint">Admin only</span>}
                        </div>
                      </td>
                      <td className="center muted">{user.department}</td>
                      <td className="center"><span className={`badge ${user.status}`}>{user.status}</span></td>
                      <td className="center muted">{user.dateJoined}</td>
                      <td className="center muted">{user.lastLoginDisplay}</td>
                      <td className="right actions">
                        <div className="action-menu">
                          <button className="menu-button" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}>
                            <LuEllipsis size={20} />
                          </button>
                          {openMenu === user.id && (
                            <div className="menu-dropdown">
                              {alreadyRequested && <div className="menu-item disabled">Pending request</div>}
                              <button className="menu-item" onClick={() => { if (!window.confirm("Are you sure you want to deactivate this user?")) return; toggleStatus(user.id); setOpenMenu(null); }}>
                                {user.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />} {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                              {user.role === "Citizen" && user.extra_roles?.some(r => r.toLowerCase() === "researcher") && (
                                <button className="menu-item danger" onClick={() => { if (!window.confirm("Are you sure you want to revoke Researcher access from this user?")) return; revokeResearcher(user.id); setOpenMenu(null); }}>
                                  <FaUserSlash size={14} /> Revoke Researcher
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {renderPagination(currentPage, totalPages, handlePageChange)}
        </>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <ResearcherRequestsTab pageSize={pageSize} onPendingCountChange={setPendingCount} />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={async () => {
          await fetchUsers(currentPage);
          setShowCreateModal(false);
        }} />
      )}
    </div>
  );
};

export default UserMgmtPage;
