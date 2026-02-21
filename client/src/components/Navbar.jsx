import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SavedJobsPanel from "./SavedJobsPanel";
import SignInModal from "./SignInModal";

export default function Navbar() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [savedJobsOpen, setSavedJobsOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <Link to="/" className="navbar-logo">
        <img src="/images/logo.png" alt="Open Window Staffing" className="navbar-logo-img" />
      </Link>
      <div className="navbar-links">
        <NavLink to="/" className="navbar-link" end>
          Home
        </NavLink>
        <div className="navbar-dropdown-wrap">
          <Link to="/jobs" className="navbar-link navbar-link--dropdown">
            Healthcare Professionals
            <span className="navbar-chevron" aria-hidden="true">▼</span>
          </Link>
          <div className="navbar-dropdown">
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Browse Companies</div>
              <Link to="/jobs" className="navbar-dropdown-link">Companies</Link>
              <Link to="/jobs" className="navbar-dropdown-link">Companies List</Link>
              <Link to="/jobs" className="navbar-dropdown-link">Job Alerts</Link>
            </div>
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Company Career</div>
              <Link to="/jobs" className="navbar-dropdown-link">Browse Jobs</Link>
              <Link to="/jobs" className="navbar-dropdown-link">Career Resources</Link>
            </div>
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Employers</div>
              <Link to="/post-job" className="navbar-dropdown-link">Post a Job</Link>
              <Link to="/jobs" className="navbar-dropdown-link">Find Talent</Link>
            </div>
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Resources</div>
              <Link to="/contact" className="navbar-dropdown-link">Contact Recruiting</Link>
              <Link to="/faq" className="navbar-dropdown-link">FAQ</Link>
            </div>
          </div>
        </div>
        <div className="navbar-dropdown-wrap">
          <Link to="/about" className="navbar-link navbar-link--dropdown">
            About Us
            <span className="navbar-chevron" aria-hidden="true">▼</span>
          </Link>
          <div className="navbar-dropdown">
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Overview</div>
              <Link to="/about" className="navbar-dropdown-link">Who We Are</Link>
              <Link to="/about" className="navbar-dropdown-link">Our Mission</Link>
              <Link to="/about" className="navbar-dropdown-link">Our Team</Link>
            </div>
            <div className="navbar-dropdown-col">
              <div className="navbar-dropdown-title">Resources</div>
              <Link to="/jobs" className="navbar-dropdown-link">Browse Jobs</Link>
              <Link to="/faq" className="navbar-dropdown-link">FAQ</Link>
            </div>
          </div>
        </div>
        <div className="navbar-dropdown-wrap">
          <Link to="/faq" className="navbar-link navbar-link--dropdown">
            FAQ
            <span className="navbar-chevron" aria-hidden="true">▼</span>
          </Link>
          <div className="navbar-dropdown navbar-dropdown--narrow">
            <Link to="/faq" className="navbar-dropdown-link">General Questions</Link>
            <Link to="/faq" className="navbar-dropdown-link">For Candidates</Link>
            <Link to="/faq" className="navbar-dropdown-link">For Employers</Link>
          </div>
        </div>
        <Link to="/contact" className="navbar-link">
          Contact Us
        </Link>
      </div>
      <div className="navbar-actions">
        <button
          type="button"
          className="navbar-icon-btn"
          aria-label="Saved jobs"
          onClick={() => setSavedJobsOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        </button>
        <div className="navbar-user-wrap">
          {isLoggedIn && (
            <span className="navbar-user-label">
              <span className="navbar-user-status" aria-hidden="true" />
              {user?.name}
            </span>
          )}
          <button
            type="button"
            className="navbar-icon-btn"
            aria-label={isLoggedIn ? "Account menu" : "Sign in"}
            aria-expanded={userMenuOpen}
            onClick={() => (isLoggedIn ? setUserMenuOpen(!userMenuOpen) : setSignInOpen(true))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          {userMenuOpen && isLoggedIn && (
            <>
              <div
                className="navbar-user-backdrop"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="navbar-user-menu">
                <p className="navbar-user-name">{user?.name}</p>
                <p className="navbar-user-email">{user?.email}</p>
                {user?.role === "recruiter" ? (
                  <>
                    <Link to="/dashboard" className="navbar-user-link" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                    <Link to="/my-jobs" className="navbar-user-link" onClick={() => setUserMenuOpen(false)}>My jobs</Link>
                    <Link to="/post-job" className="navbar-user-link" onClick={() => setUserMenuOpen(false)}>Post a job</Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard" className="navbar-user-link" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                    <Link to="/my-applications" className="navbar-user-link" onClick={() => setUserMenuOpen(false)}>My applications</Link>
                  </>
                )}
                <button
                  type="button"
                  className="navbar-user-logout"
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                    navigate("/");
                  }}
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
        <SavedJobsPanel isOpen={savedJobsOpen} onClose={() => setSavedJobsOpen(false)} />
        <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
        <Link to="/post-job" className="navbar-cta">
          POST A JOB
          <span className="navbar-cta-plus" aria-hidden="true">
            <span className="navbar-cta-plus-inner">+</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
