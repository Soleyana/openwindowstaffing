import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTopOnNavigate from "./components/ScrollToTopOnNavigate";
import Footer from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout";
import RedirectToDashboard from "./components/RedirectToDashboard";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import PostJob from "./pages/PostJob";
import JobEdit from "./pages/JobEdit";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import JobDetail from "./pages/JobDetail";
import ApplyJob from "./pages/ApplyJob";
import MyApplications from "./pages/MyApplications";
import MyAssignments from "./pages/MyAssignments";
import MyOffers from "./pages/MyOffers";
import MyContracts from "./pages/MyContracts";
import ContractSign from "./pages/ContractSign";
import Onboarding from "./pages/Onboarding";
import Timesheets from "./pages/Timesheets";
import TimesheetsInbox from "./pages/TimesheetsInbox";
import MyJobs from "./pages/MyJobs";
import Dashboard from "./pages/Dashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import InviteRecruiter from "./pages/InviteRecruiter";
import ProtectedRoute from "./components/ProtectedRoute";
import Companies from "./pages/Companies";
import JobAlerts from "./pages/JobAlerts";
import CareerResources from "./pages/CareerResources";
import MyCompanies from "./pages/MyCompanies";
import ManageCompanies from "./pages/ManageCompanies";
import ManageFacilities from "./pages/ManageFacilities";
import Reviews from "./pages/Reviews";
import ManageTestimonials from "./pages/ManageTestimonials";
import StaffingRequests from "./pages/StaffingRequests";
import Orders from "./pages/Orders";
import Invoices from "./pages/Invoices";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import HealthcareProfessionals from "./pages/HealthcareProfessionals";
import Blogs from "./pages/Blogs";
import Legal from "./pages/Legal";
import Status from "./pages/Status";
import Unsubscribe from "./pages/Unsubscribe";
import AccountSettings from "./pages/AccountSettings";
import MyProfile from "./pages/MyProfile";
import CandidateSearch from "./pages/CandidateSearch";
import Analytics, { usePageView } from "./components/Analytics";
import "./App.css";

const ApplicantPipeline = lazy(() => import("./pages/ApplicantPipeline"));
const CandidateDetail = lazy(() => import("./pages/CandidateDetail"));
const ListingReports = lazy(() => import("./pages/ListingReports"));
const Inbox = lazy(() => import("./pages/Inbox"));

function RouteFallback({ label = "Loading…" }) {
  return (
    <div className="dashboard-page" style={{ padding: "2rem", textAlign: "center", color: "var(--text-light)" }}>
      {label}
    </div>
  );
}

const DASHBOARD_PATHS = ["/dashboard", "/recruiter-dashboard", "/onboarding", "/notifications", "/admin", "/my-jobs", "/my-companies", "/listing-reports", "/orders", "/post-job", "/my-applications", "/my-assignments", "/my-offers", "/my-contracts", "/contract", "/timesheets", "/timesheets-inbox", "/invoices", "/account-settings", "/applicant-pipeline", "/invite-recruiter", "/inbox", "/staffing-requests", "/candidates", "/candidate", "/dashboard/companies/manage", "/dashboard/facilities", "/dashboard/testimonials"];

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.some((p) => location.pathname.startsWith(p) || location.pathname === p);
  usePageView();

  return (
    <>
      <div className="app-content">
        <ErrorBoundary fallbackLabel="Page">
          <Routes>
            <Route path="/" element={<RedirectToDashboard><Home /></RedirectToDashboard>} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/edit" element={<JobEdit />} />
            <Route path="/apply/:jobId" element={<ApplyJob />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/status" element={<Status />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies-list" element={<Companies />} />
            <Route path="/job-alerts" element={<JobAlerts />} />
            <Route path="/career-resources" element={<CareerResources />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/recruiter-dashboard" element={<ProtectedRoute roles={["recruiter", "owner"]}><RecruiterDashboard /></ProtectedRoute>} />
              <Route path="/applicant-pipeline" element={<ProtectedRoute roles={["recruiter", "owner"]}><Suspense fallback={<RouteFallback />}><ApplicantPipeline /></Suspense></ProtectedRoute>} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/my-applications" element={<MyApplications />} />
              <Route path="/my-assignments" element={<MyAssignments />} />
              <Route path="/my-offers" element={<MyOffers />} />
              <Route path="/my-contracts" element={<MyContracts />} />
              <Route path="/contract/:id/sign" element={<ContractSign />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/timesheets" element={<Timesheets />} />
              <Route path="/timesheets-inbox" element={<ProtectedRoute roles={["recruiter", "owner"]}><TimesheetsInbox /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute roles={["recruiter", "owner"]}><ErrorBoundary fallbackLabel="Invoices"><Invoices /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/inbox" element={<Suspense fallback={<RouteFallback label="Loading inbox…" />}><ErrorBoundary fallbackLabel="Inbox"><Inbox /></ErrorBoundary></Suspense>} />
              <Route path="/candidates" element={<ProtectedRoute roles={["recruiter", "owner"]}><CandidateSearch /></ProtectedRoute>} />
              <Route path="/candidate/:candidateId" element={<ProtectedRoute roles={["recruiter", "owner"]}><Suspense fallback={<RouteFallback />}><CandidateDetail /></Suspense></ProtectedRoute>} />
              <Route path="/my-companies" element={<ProtectedRoute roles={["recruiter", "owner"]}><MyCompanies /></ProtectedRoute>} />
              <Route path="/dashboard/companies/manage" element={<ProtectedRoute roles={["recruiter", "owner"]}><ManageCompanies /></ProtectedRoute>} />
              <Route path="/dashboard/facilities" element={<ProtectedRoute roles={["recruiter", "owner"]}><ManageFacilities /></ProtectedRoute>} />
              <Route path="/dashboard/testimonials" element={<ProtectedRoute roles={["recruiter", "owner"]}><ManageTestimonials /></ProtectedRoute>} />
              <Route path="/listing-reports" element={<ProtectedRoute roles={["recruiter", "owner"]}><Suspense fallback={<RouteFallback />}><ListingReports /></Suspense></ProtectedRoute>} />
              <Route path="/staffing-requests" element={<ProtectedRoute roles={["recruiter", "owner"]}><StaffingRequests /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute roles={["recruiter", "owner"]}><Orders /></ProtectedRoute>} />
              <Route path="/post-job" element={<PostJob />} />
              <Route path="/invite-recruiter" element={<ProtectedRoute roles={["owner"]}><InviteRecruiter /></ProtectedRoute>} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
        </div>
      {!isDashboard && <Footer />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
        <ToastProvider>
        <Analytics />
        <BrowserRouter>
        <ScrollToTopOnNavigate />
        <Navbar />
        <AppContent />
      </BrowserRouter>
        </ToastProvider>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
