import { Helmet } from "react-helmet-async";
import { BRAND } from "../config";
import Hero from "../components/Hero";
import PopularCategories from "../components/PopularCategories";
import StartNow from "../components/StartNow";
import AudienceSplit from "../components/AudienceSplit";
import LatestJobs from "../components/LatestJobs";
import HowItWorks from "../components/HowItWorks";
import Testimonial from "../components/Testimonial";
import WhatsThinking from "../components/WhatsThinking";
import ApplyCTA from "../components/ApplyCTA";
import ScrollToTop from "../components/ScrollToTop";

const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

export default function Home() {
  return (
    <main className="home-page">
      <Helmet>
        <title>{BRAND.companyName} – Healthcare Staffing</title>
        <meta name="description" content={`${BRAND.companyName} connects healthcare professionals with top opportunities. Find nursing, allied health, travel nursing, and therapy jobs.`} />
        <meta property="og:title" content={`${BRAND.companyName} – Healthcare Staffing`} />
        <meta property="og:description" content={`${BRAND.companyName} connects healthcare professionals with top opportunities.`} />
        <meta property="og:type" content="website" />
        {SITE_URL && <meta property="og:url" content={SITE_URL} />}
      </Helmet>
      <Hero />
      <PopularCategories />
      <StartNow />
      <AudienceSplit />
      <LatestJobs />
      <HowItWorks />
      <Testimonial />
      <WhatsThinking />
      <ApplyCTA />
      <ScrollToTop />
    </main>
  );
}
