import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/api/jobs`;

export default function PopularCategories() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setCount(json.data.length);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const categories = [
    { name: "Nursing", count },
    { name: "Allied Health", count },
    { name: "Therapy", count },
  ];

  return (
    <section className="popular-categories">
      <h2 className="popular-categories-title">Popular Categories</h2>
      <div className="popular-categories-list">
        {categories.map((cat, i) => (
          <Link key={i} to="/jobs" className="popular-category-item">
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
