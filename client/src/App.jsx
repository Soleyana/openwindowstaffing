import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import JobDetail from "./pages/JobDetail";
import MyApplications from "./pages/MyApplications";
import MyJobs from "./pages/MyJobs";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import "./App.css";

const DASHBOARD_PATHS = ["/dashboard", "/my-jobs", "/my-companies", "/listing-reports", "/orders", "/post-job", "/my-applications"];

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.some((p) => location.pathname.startsWith(p) || location.pathname === p);

  return (
    <>
      <div className="app-content">
        <Routes>
            <Route path="/" element={<RedirectToDashboard><Home /></RedirectToDashboard>} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/my-applications" element={<MyApplications />} />
              <Route path="/my-companies" element={<PlaceholderPage title="My Companies" />} />
              <Route path="/listing-reports" element={<PlaceholderPage title="Listing Reports" />} />
              <Route path="/orders" element={<PlaceholderPage title="Orders" />} />
              <Route path="/post-job" element={<PostJob />} />
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
        <BrowserRouter>
        <ScrollToTopOnNavigate />
        <Navbar />
        <AppContent />
      </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
