// Dylan Hartley

"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  MessageSquare,
  Code2,
  Briefcase,
  ChevronDown,
} from "lucide-react";

// Bidirectional scroll reveal — re-animates on every scroll up or down
function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      ".reveal-left, .reveal-right, .reveal-up",
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          } else {
            entry.target.classList.remove("reveal-visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// Hide scroll arrow once user has scrolled past the hero
function useScrollArrow() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHidden(window.scrollY > window.innerHeight * 0.45);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return hidden;
}

export default function Home() {
  const { data: session } = useSession();
  useScrollReveal();
  const arrowHidden = useScrollArrow();

  return (
    <main className="landing-page">
      {/* ── Section 1: Hero ── */}
      <section className="hero-section">
        {/* Mesh gradient blobs */}
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />
        <div className="hero-orb hero-orb--4" />

        <div className="hero-inner">
          {/* Brand: half-circle image + SKILL SIFT text */}
          <div
            className="hero-brand hero-animate"
            style={{ animationDelay: "0.05s" }}
          >
            <Image
              src="/images/landing/skillsift-split-circle.png"
              alt="SkillSift"
              width={280}
              height={280}
              className="object-contain"
              priority
            />
            <div className="hero-brand-text">
              <span>SKILL</span>
              <span>SIFT</span>
            </div>
          </div>

          {/* Divider */}
          <div
            className="hero-divider hero-animate"
            style={{ animationDelay: "0.2s" }}
          />

          {/* Quote */}
          <div
            className="hero-quote hero-animate"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="hero-quote-mark">&ldquo;</span>
            <p>
              Every job seeker deserves the same coach,
              <br />
              the same scoring, and
              <br />
              the same shot
            </p>
          </div>

          {/* CTA buttons — only when logged out */}
          {!session?.user && (
            <div
              className="hero-cta hero-animate"
              style={{ animationDelay: "0.42s" }}
            >
              <Link href="/signup" className="btn-primary">
                Get Started <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn-ghost">
                Login
              </Link>
            </div>
          )}

          {/* Feature pills */}
          <div
            className="hero-features hero-animate"
            style={{ animationDelay: "0.55s" }}
          >
            <div className="hero-feature-pill">
              <FileText size={13} />
              Resume Review
            </div>
            <span className="hero-feature-sep" />
            <div className="hero-feature-pill">
              <MessageSquare size={13} />
              Mock Interviews
            </div>
            <span className="hero-feature-sep" />
            <div className="hero-feature-pill">
              <Code2 size={13} />
              Technical Prep
            </div>
            <span className="hero-feature-sep" />
            <div className="hero-feature-pill">
              <Briefcase size={13} />
              Job Tracking
            </div>
          </div>
        </div>
      </section>

      {/* Scroll-down arrow */}
      <div className={`scroll-arrow${arrowHidden ? " hidden" : ""}`}>
        <ChevronDown size={22} strokeWidth={2.5} />
      </div>

      {/* ── Section 2: Resume Review ── */}
      <section className="feature-section alt-bg">
        <div className="split-layout">
          <div className="split-media reveal-left">
            <Image
              src="/images/landing/resume-card.png"
              alt="Resume Review"
              width={480}
              height={390}
              className="object-contain"
            />
          </div>

          <div className="split-content reveal-right">
            <div className="feature-tag">
              <FileText size={13} />
              Resume Review
            </div>

            <h2 className="section-heading">
              Get your resume <span className="text-accent">noticed</span>
            </h2>

            <p className="section-body">
              Upload your resume and receive detailed AI feedback on structure,
              content, and overall impact. Know exactly what recruiters look for
              and how your application measures up.
            </p>

            <Link
              href="/resume"
              className="btn-primary"
              style={{ width: "fit-content" }}
            >
              Try Resume Review <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 3: Behavioral + Technical ── */}
      <section className="feature-section">
        <div className="panels-layout">
          <div className="feature-panel reveal-left">
            <div className="panel-media">
              <Image
                src="/images/landing/interview-card.png"
                alt="Behavioral Interview"
                width={300}
                height={240}
                className="object-contain"
              />
            </div>
            <div className="panel-content">
              <div className="feature-tag">
                <MessageSquare size={13} />
                Behavioral Interview
              </div>

              <h3 className="panel-heading">Answer with confidence</h3>

              <p className="section-body">
                Practice with an AI interviewer that responds to your answers in
                real time. Get feedback on delivery, structure, and substance so
                every response lands.
              </p>

              <Link
                href="/interview/behavioral"
                className="btn-outline"
                style={{ width: "fit-content", marginTop: "0.25rem" }}
              >
                Start Practicing <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div
            className="feature-panel reveal-right"
            style={{ transitionDelay: "0.12s" }}
          >
            <div className="panel-media">
              <Image
                src="/images/landing/technical-card.png"
                alt="Technical Interview"
                width={300}
                height={240}
                className="object-contain"
              />
            </div>
            <div className="panel-content">
              <div className="feature-tag">
                <Code2 size={13} />
                Technical Interview
              </div>

              <h3 className="panel-heading">Sharpen your skills</h3>

              <p className="section-body">
                Tackle curated technical questions across data structures,
                algorithms, and system design. Get instant explanations and
                build real confidence before the real thing.
              </p>

              <Link
                href="/technical"
                className="btn-outline"
                style={{ width: "fit-content", marginTop: "0.25rem" }}
              >
                Start Practicing <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Job Tracker ── */}
      <section className="feature-section alt-bg">
        <div className="split-layout">
          <div className="split-content reveal-left">
            <div className="feature-tag">
              <Briefcase size={13} />
              Job Tracker
            </div>

            <h2 className="section-heading">
              Never miss an <span className="text-accent">opportunity</span>
            </h2>

            <p className="section-body">
              Track every application, deadline, and follow-up in one place.
              Stay organized and move through your job search with clarity and
              control.
            </p>

            <Link
              href="/jobs"
              className="btn-primary"
              style={{ width: "fit-content" }}
            >
              Open Job Tracker <ArrowRight size={17} />
            </Link>
          </div>

          <div className="split-media reveal-right">
            <Image
              src="/images/landing/tracker-card.png"
              alt="Job Tracker"
              width={480}
              height={390}
              className="object-contain"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
