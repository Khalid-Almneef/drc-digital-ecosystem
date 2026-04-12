"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glassmorphism py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
        {/* Brand Logo Placeholder */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">
            DRC
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">
            Drones & Robotics Club
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-medium">
          <Link href="#overview" className="text-sm hover:text-brand-accent transition-colors">
            Overview
          </Link>
          <Link href="#hackathons" className="text-sm hover:text-brand-accent transition-colors">
            Hackathons
          </Link>
          <Link href="#alumni" className="text-sm hover:text-brand-accent transition-colors">
            Alumni
          </Link>
        </nav>

        {/* Action Button */}
        <div className="hidden md:block">
          <button className="bg-brand-primary text-white hover:bg-brand-primary/90 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-lg shadow-brand-primary/20">
            Join Us
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glassmorphism mt-4 border-t border-white/10"
        >
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
            <Link
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              Overview
            </Link>
            <Link
              href="#hackathons"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              Hackathons
            </Link>
            <Link
              href="#alumni"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2"
            >
              Alumni
            </Link>
            <button className="bg-brand-primary text-white px-6 py-3 rounded-xl text-sm font-medium w-full mt-2">
              Join Us
            </button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};
