"use client";

import { motion } from "motion/react";
import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";

type Session = {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
} | null;

const Navbar = ({ session }: { session: Session }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
      animate={{
        backgroundColor: isScrolled ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0)",
        backdropFilter: isScrolled ? "blur(10px)" : "blur(0px)",
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-[100] flex w-full items-center justify-between px-4 md:px-8 lg:px-16 py-4 border-b"
      style={{
        borderColor: isScrolled ? "rgba(255, 255, 255, 0.1)" : "transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-full" />
        <h1 className="text-base font-bold md:text-2xl text-white">EduSmart</h1>
      </div>
      <Button variant="outline">
        {session ? (
          <Link href="/dashboard">Dashboard</Link>
        ) : (
          <Link href="/auth/login">Login</Link>
        )}
      </Button>
    </motion.nav>
  );
};

export default Navbar;
