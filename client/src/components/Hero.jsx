import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import heroBgUrl from "../assets/hero-bg.jpg";

// Preload hero image as soon as the module loads so the browser fetches it early
const preloadHeroImage = () => {
  const img = new Image();
  img.src = heroBgUrl;
};
preloadHeroImage();

const categoryOptions = [
  { value: "", label: "Choose a category..." },
  { value: "nursing", label: "Nursing" },
  { value: "allied-health", label: "Allied Health" },
  { value: "therapy", label: "Therapy" },
  { value: "travel-nursing", label: "Travel Nursing" },
  { value: "administrative", label: "Administrative" },
  { value: "physician-provider", label: "Physician & Provider" },
  { value: "behavioral-health", label: "Behavioral Health" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "diagnostic-imaging", label: "Diagnostic & Imaging" },
  { value: "home-health", label: "Home Health" },
  { value: "leadership", label: "Leadership & Management" },
];

export default function Hero() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setHeroLoaded(true);
    img.src = heroBgUrl;
    if (img.complete) setHeroLoaded(true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keywords) params.set("keywords", keywords);
    if (location) params.set("location", location);
    if (category) params.set("category", category);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <section
      className={`hero hero--video ${heroLoaded ? "" : "hero--loading"}`}
      style={{ "--hero-bg-url": `url(${heroBgUrl})` }}
    >
      <div className="hero-video-wrap hero--image-wrap">
        <img
          src={heroBgUrl}
          alt=""
          className="hero-bg-image"
          onLoad={() => setHeroLoaded(true)}
        />
        <div className="hero-video-overlay" aria-hidden="true" />
      </div>
      <div className="hero-content">
        <h1 className="hero-title">Find Your Dream Healthcare Job</h1>
        <p className="hero-subtitle">Connect with nursing, allied health, and clinical staffing opportunities nationwide.</p>
        <form onSubmit={handleSearch} className="hero-search-box">
          <input
            type="text"
            className="hero-field"
            placeholder="Keywords (e.g. RN, Therapist)"
            aria-label="Keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <input
            type="text"
            className="hero-field"
            placeholder="Location"
            aria-label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select className="hero-field" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="submit" className="hero-button">
            SEARCH
          </button>
        </form>
        <Link to="/jobs" className="hero-advanced-link">
          Advanced search
        </Link>
      </div>
    </section>
  );
}
