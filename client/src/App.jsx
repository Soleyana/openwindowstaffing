import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import JobDetail from "./pages/JobDetail";
import ApplyJob from "./pages/ApplyJob";
import MyApplications from "./pages/MyApplications";
import MyJobs from "./pages/MyJobs";
import Dashboard from "./pages/Dashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import InviteRecruiter from "./pages/InviteRecruiter";
import ApplicantPipeline from "./pages/ApplicantPipeline";
import ProtectedRoute from "./components/ProtectedRoute";
import PlaceholderPage from "./pages/PlaceholderPage";
import Companies from "./pages/Companies";
import JobAlerts from "./pages/JobAlerts";
import CareerResources from "./pages/CareerResources";
import MyCompanies from "./pages/MyCompanies";
import ListingReports from "./pages/ListingReports";
import Orders from "./pages/Orders";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import HealthcareProfessionals from "./pages/HealthcareProfessionals";
import Blogs from "./pages/Blogs";
import Legal from "./pages/Legal";
import AccountSettings from "./pages/AccountSettings";
import Analytics, { usePageView } from "./components/Analytics";
import "./App.css";

const DASHBOARD_PATHS = ["/dashboard", "/recruiter-dashboard", "/my-jobs", "/my-companies", "/listing-reports", "/orders", "/post-job", "/my-applications", "/account-settings", "/applicant-pipeline", "/invite-recruiter"];

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.some((p) => location.pathname.startsWith(p) || location.pathname === p);
  usePageView();

  return (
    <>
      <div className="app-content">
        <Routes>
            <Route path="/" element={<RedirectToDashboard><Home /></RedirectToDashboard>} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/apply/:jobId" element={<ApplyJob />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies-list" element={<Companies />} />
            <Route path="/job-alerts" element={<JobAlerts />} />
            <Route path="/career-resources" element={<CareerResources />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/recruiter-dashboard" element={<ProtectedRoute roles={["recruiter", "owner"]}><RecruiterDashboard /></ProtectedRoute>} />
              <Route path="/applicant-pipeline" element={<ProtectedRoute roles={["recruiter", "owner"]}><ApplicantPipeline /></ProtectedRoute>} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/my-applications" element={<MyApplications />} />
              <Route path="/my-companies" element={<ProtectedRoute roles={["recruiter", "owner"]}><MyCompanies /></ProtectedRoute>} />
              <Route path="/listing-reports" element={<ProtectedRoute roles={["recruiter", "owner"]}><ListingReports /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute roles={["recruiter", "owner"]}><Orders /></ProtectedRoute>} />
              <Route path="/post-job" element={<PostJob />} />
              <Route path="/invite-recruiter" element={<ProtectedRoute roles={["owner"]}><InviteRecruiter /></ProtectedRoute>} />
              <Route path="/account-settings" element={<AccountSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      {!isDashboard && <Footer />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <Analytics />
        <BrowserRouter>
        <ScrollToTopOnNavigate />
        <Navbar />
        <AppContent />
      </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
