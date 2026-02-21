import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignInModal from "../components/SignInModal";
import JobPostForm from "../components/JobPostForm";

export default function PostJob() {
  const { isLoggedIn, user } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <div className="post-job-page">
      <h1 className="post-job-title">Post Job</h1>
      <nav className="post-job-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        <span className="post-job-breadcrumb-sep" aria-hidden="true">
          {" > "}
        </span>
        <span>Post Job</span>
      </nav>
      {isLoggedIn && user?.role === "recruiter" ? (
        <div className="post-job-form-wrap">
          <p className="post-job-welcome">Welcome, {user.name}. Post a new job listing.</p>
          <JobPostForm />
        </div>
      ) : !isLoggedIn ? (
        <div className="post-job-gate">
          <p className="post-job-gate-text">You must sign in to create a new listing.</p>
          <div className="post-job-gate-buttons">
            <button
              type="button"
              className="post-job-signin-btn"
              onClick={() => setShowSignIn(true)}
            >
              SIGN IN
            </button>
            <Link to="/signup" className="post-job-signup-link">Sign up</Link>
          </div>
        </div>
      ) : (
        <div className="post-job-gate">
          <p className="post-job-gate-text">Only recruiters can post jobs. Sign up as an employer to post listings.</p>
          <Link to="/signup" className="post-job-signup-btn">Create recruiter account</Link>
        </div>
      )}
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
}
