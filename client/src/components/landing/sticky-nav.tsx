import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from "wouter";

const navLinks = [
  { name: 'Story', href: '#the-chaos' },
  { name: 'Features', href: '#the-breakthrough' },
  { name: 'AI', href: '#ai-concierge' },
  { name: 'WhatsApp', href: '#whatsapp' },
  { name: 'Rooms', href: '#room-assignment' },
  { name: 'Transport', href: '#transport-planning' },
  { name: 'Demo', href: '#cta' },
];

export const StickyNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState('');
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)']
  );

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';

      sections.forEach((section) => {
        // Use getBoundingClientRect for TypeScript compatibility
        const rect = section.getBoundingClientRect();
        // Calculate position relative to viewport
        if (rect.top <= 200 && rect.bottom >= 200) {
          current = section.getAttribute('id') || '';
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY,
        behavior: 'smooth',
      });
    }
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 py-4 px-6 flex justify-between items-center"
      style={{ backgroundColor }}
    >
      <Link href="/" className="text-white font-script text-2xl">
        Eternally Yours
      </Link>

      <nav className="hidden md:flex space-x-1">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            onClick={(e) => scrollToSection(e, link.href)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
              activeSection === link.href.substring(1)
                ? 'text-white bg-primary'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            {link.name}
          </a>
        ))}
      </nav>
      
      <div className="flex md:hidden">
        <button className="text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <Link href="/auth" className="hidden md:flex bg-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors duration-300">
        Login
      </Link>
    </motion.header>
  );
};