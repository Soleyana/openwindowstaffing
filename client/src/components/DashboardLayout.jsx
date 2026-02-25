import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";

const SidebarIcon = ({ name }) => {
  const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "dashboard") return <svg {...iconProps}><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></svg>;
  if (name === "briefcase") return <svg {...iconProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
  if (name === "building") return <svg {...iconProps}><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
  if (name === "chart") return <svg {...iconProps}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
  if (name === "card") return <svg {...iconProps}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
  if (name === "plus") return <svg {...iconProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
  if (name === "search") return <svg {...iconProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
  if (name === "users") return <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  if (name === "settings") return <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
  return null;
};

export default function DashboardLayout() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const isRecruiter = isStaff(user?.role);

  const recruiterNavItems = [
    { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/applicant-pipeline", icon: "users", label: "Applicant Pipeline" },
    { to: "/recruiter-dashboard", icon: "users", label: "Applicants & Invite Staff" },
    { to: "/my-jobs", icon: "briefcase", label: "My Jobs" },
    { to: "/my-companies", icon: "building", label: "My Companies" },
    { to: "/listing-reports", icon: "chart", label: "Listing Reports" },
    { to: "/orders", icon: "card", label: "Orders" },
  ];

  const candidateNavItems = [
    { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/my-applications", icon: "briefcase", label: "My Applications" },
    { to: "/jobs", icon: "search", label: "Browse Jobs" },
  ];

  const navItems = isRecruiter ? recruiterNavItems : candidateNavItems;
  const listingItems = isRecruiter ? [{ to: "/post-job", icon: "plus", label: "Post Job" }] : [];
  const accountItems = [{ to: "/account-settings", icon: "settings", label: "Account Settings" }];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-avatar" aria-hidden="true">
          <span>{user?.name?.charAt(0) || "U"}</span>
        </div>
        <nav className="dashboard-sidebar-nav">
          <div className="dashboard-sidebar-group">
            <span className="dashboard-sidebar-group-title">MAIN</span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `dashboard-sidebar-link ${isActive ? "dashboard-sidebar-link--active" : ""}`
                }
              >
                <span className="dashboard-sidebar-icon" aria-hidden="true">
                  <SidebarIcon name={item.icon} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
          {listingItems.length > 0 && (
            <div className="dashboard-sidebar-group">
              <span className="dashboard-sidebar-group-title">LISTING</span>
              {listingItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `dashboard-sidebar-link ${isActive ? "dashboard-sidebar-link--active" : ""}`
                  }
                >
                  <span className="dashboard-sidebar-icon" aria-hidden="true">
                    <SidebarIcon name={item.icon} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
          <div className="dashboard-sidebar-group">
            <span className="dashboard-sidebar-group-title">ACCOUNT</span>
            {accountItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `dashboard-sidebar-link ${isActive ? "dashboard-sidebar-link--active" : ""}`
                }
              >
                <span className="dashboard-sidebar-icon" aria-hidden="true">
                  <SidebarIcon name={item.icon} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
