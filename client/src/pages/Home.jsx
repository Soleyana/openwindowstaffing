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

export default function Home() {
  return (
    <main className="home-page">
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
