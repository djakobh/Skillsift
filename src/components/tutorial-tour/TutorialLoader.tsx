"use client";

import dynamic from "next/dynamic";

const Tutorial = dynamic(() => import("./Tutorial"), { ssr: false });

export default function TutorialLoader() {
  return <Tutorial />;
}
