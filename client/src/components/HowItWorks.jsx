import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../config";

const steps = [
  "Register now and complete your profile. Be as detailed as possible.",
  "Log in to search jobs, view pay packages and review facility information.",
  "Click \"I'm Interested\" to let your recruiter know.",
];

export default function HowItWorks() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.currentTime = 0;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  return (
    <section className="how-it-works">
      <div className="how-it-works-inner">
        <div className="how-it-works-left">
          <h2 className="how-it-works-title">How it Works</h2>
          <p className="how-it-works-desc">
            {BRAND.companyName} connects healthcare professionals with top facilities nationwide. Whether you&apos;re a nurse, therapist, or allied health professional, we make it simple to find your next opportunity.
          </p>
          <ol className="how-it-works-steps">
            {steps.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ol>
        </div>
        <div className="how-it-works-right">
          <div ref={containerRef} className="how-it-works-video">
            <video
              ref={videoRef}
              className="how-it-works-video-element"
              src="/videos/Openwindow.mp4"
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="how-it-works-video-controls">
              <button
                type="button"
                className="how-it-works-play-pause"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                type="button"
                className="how-it-works-unmute"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? "🔇 Unmute" : "🔊"}
              </button>
            </div>
          </div>
          <Link to="/jobs" className="how-it-works-btn">See the Difference</Link>
        </div>
      </div>
    </section>
  );
}
