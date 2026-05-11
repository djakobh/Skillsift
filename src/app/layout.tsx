//Alexander Tu
// 02/11/2025

// Dylan Hartley
// 12/12/2025

import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import Navbar from "~/components/Navbar";
import SessionProvider from "~/components/SessionProvider";
import ChatWidget from "~/components/ChatWidget";
import { ThemeProvider } from "~/components/ThemeProvider";
import TutorialLoader from "~/components/tutorial-tour/TutorialLoader";

export const metadata: Metadata = {
  title: "SkillSift",
  description: "All in one prep tool that actually works.",
  icons: [{ rel: "icon", url: "/images/landing/skillsift-split-circle.png" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});



export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <head>
        {/* Prevent flash of unstyled content: apply saved dark mode before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('skillsift-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      {/* suppressHydrationWarning: Grammarly and similar extensions inject
          attributes (data-gr-ext-installed, data-new-gr-c-s-check-loaded)
          onto <body> before React hydrates, which otherwise triggers a
          hydration mismatch warning. */}
      <body suppressHydrationWarning>
        <TRPCReactProvider>
          <SessionProvider>
            <ThemeProvider>
              {/* <Navbar /> */}
              {/* <TutorialLoader /> */}
              {children}
              <ChatWidget />
            </ThemeProvider>
          </SessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
