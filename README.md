# SkillSift

**The all-in-one job prep tool that actually works.**

> Live site: [https://www.skillsift.xyz](https://www.skillsift.xyz)

---

## Viewing the Project

**Please visit the live site instead of running the repo locally.**

The app depends on several external APIs and services (authentication, database, AI providers, cloud storage) that require private environment variables. Setting these up locally is non-trivial, and the live deployment on Vercel is always up to date.

👉 **[https://www.skillsift.xyz](https://www.skillsift.xyz)**

---

## What is SkillSift?

SkillSift is an AI-powered interview and job application prep platform built for students and early-career candidates. It gives every user the same quality of coaching and feedback that was previously only available to those with expensive resources or insider connections.

---

## Features

### Resume Scanner
Upload your resume and paste a job description. SkillSift runs it through a Workday-style ATS scoring engine that grades your resume across five weighted dimensions — technical skills, experience, education, soft skills, and tools. You get a score, a letter grade, a keyword breakdown showing what's matched and what's missing, and AI-generated suggestions to improve your resume content.

### Behavioral Interview
Practice mock interviews with an AI interviewer that listens and responds to your answers in real time. A live camera feed records your session, and after each response you receive structured feedback on delivery, content, and the STAR format.

### Technical Interview
Work through curated coding and system design questions in a built-in code editor. Get instant AI explanations and hints when you're stuck, and track your progress across sessions.

### Job Tracker
Keep all your applications in one place. Log companies, positions, salaries, and job descriptions. Update your application status inline — from Saved all the way to Offer or Rejected — and monitor your overall offer rate at a glance.

### History
Review every resume scan and interview session you've completed. All results are stored to your account so you can track improvement over time.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma (hosted on Railway)
- **Auth:** NextAuth v5
- **AI:** Groq (LLaMA), Google Gemini
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel

---

*Built for CS 491 — Senior Capstone Project*
