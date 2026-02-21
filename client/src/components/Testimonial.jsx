import { useState, useCallback } from "react";

const testimonials = [
  {
    text: "This is such a great website. Uploaded my resume and got employed directly. Open Window Staffing changed my life!",
    name: "Linda Harris",
    role: "Healthcare Professional",
  },
  {
    text: "Found my dream travel nursing assignment in 2 weeks. The process was seamless and the support team was incredible.",
    name: "Marcus Chen",
    role: "Travel RN",
  },
  {
    text: "As a facility, we've filled 15 positions through Open Window. The quality of candidates is outstanding.",
    name: "Sarah Mitchell",
    role: "HR Director",
  },
  {
    text: "Finally a platform that understands allied health. Got multiple PT job offers within days of signing up.",
    name: "Jennifer Walsh",
    role: "Physical Therapist",
  },
  {
    text: "The best staffing solution we've used. Responsive, professional, and the candidates are always prepared.",
    name: "David Park",
    role: "Nursing Manager",
  },
];

export default function Testimonial() {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const goTo = useCallback((i) => {
    setIndex((i + testimonials.length) % testimonials.length);
  }, []);

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goTo(index + 1);
    else if (isRightSwipe) goTo(index - 1);
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, index, goTo]);

  const t = testimonials[index];

  return (
    <section className="testimonial-section">
      <div className="testimonial-bg" aria-hidden="true" />
      <div className="testimonial-card-wrap">
        <div
          className="testimonial-card"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-label="Customer testimonials"
        >
          <span className="testimonial-quote" aria-hidden="true">"</span>
          <p className="testimonial-text">{t.text}</p>
          <div className="testimonial-author">
            <div className="testimonial-avatar" />
            <div>
              <span className="testimonial-name">{t.name}</span>
              <span className="testimonial-meta">{t.role}</span>
            </div>
          </div>
          <div className="testimonial-dots">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`testimonial-dot ${i === index ? "testimonial-dot--active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`View testimonial ${i + 1}`}
                aria-pressed={i === index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
