"use client";
import { TypewriterEffect } from "../ui/typewriter-effect";

export function ComingSoon() {
  const words = [
    {
      text: "We",
    },
    {
      text: "are",
    },
    {
      text: "currently",
    },
    {
      text: "working",
    },
    {
      text: "hard",
    },
    {
      text: "to",
    },
    {
      text: "bring",
    },
    {
      text: "the",
    },
    {
      text: "site",
    },
    {
      text: "to",
    },
    {
      text: "live.",
      className: "text-primary dark:text-primary",
    },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-[40rem] ">
      <p className="text-neutral-600 dark:text-neutral-200 text-base  mb-10">
        Coming Soon
      </p>
      <TypewriterEffect words={words} className="w-4/5" />
    </div>
  );
}
