import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../api/jobs";

export default function PopularCategories() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getJobs()
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setCount(json.data.length);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const categories = [
    { name: "Nursing", slug: "nursing", count },
    { name: "Allied Health", slug: "allied-health", count },
    { name: "Therapy", slug: "therapy", count },
    { name: "Travel Nursing", slug: "travel-nursing", count },
    { name: "Administrative", slug: "administrative", count },
    { name: "Behavioral Health", slug: "behavioral-health", count },
    { name: "Pharmacy", slug: "pharmacy", count },
    { name: "Home Health", slug: "home-health", count },
  ];

  return (
    <section className="popular-categories">
      <h2 className="popular-categories-title">Popular Categories</h2>
      <div className="popular-categories-list">
        {categories.map((cat, i) => (
          <Link key={i} to={`/jobs?category=${cat.slug}`} className="popular-category-item">
            <span className="popular-category-name">{cat.name}</span>
            <span className="popular-category-count">
              ({cat.count} open positions)
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
