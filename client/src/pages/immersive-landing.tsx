import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import NightSky from "@/components/landing/cinematic/night-sky";
import { get } from "@/lib/api-utils";

// Import custom styles for immersive landing page
import "@/styles/immersive-landing.css";

// Register GSAP plugins only once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// Memoized utility function for performance optimization
// Enhanced throttle function with cancel capability for better memory cleanup
interface ThrottledFunction {
  (this: any, ...args: any[]): void;
  cancel?: () => void;
}

const throttle = (func: Function, limit: number): ThrottledFunction => {
  let inThrottle: boolean;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const throttledFn: ThrottledFunction = function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      timeoutId = setTimeout(() => (inThrottle = false), limit);
    }
  };
  
  // Add cancel method to the throttled function for cleanup
  throttledFn.cancel = function() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return throttledFn;
}

// Define section IDs for navigation
const SECTIONS = {
  HERO: "hero",
  PROBLEM: "problem",
  SOLUTION: "solution",
  GUEST_MANAGEMENT: "guest-management",
  TRANSPORT: "transport",
  ACCOMMODATION: "accommodation",
  COMMUNICATION: "communication",
  AI_ASSISTANT: "ai-assistant",
  TESTIMONIALS: "testimonials",
  CTA: "cta",
};

// Bootstrap status interface
interface BootstrapStatus {
  isFirstTimeSetup: boolean;
  hasValidConfig: boolean;
  isBootstrapMode: boolean;
  setupTokenActive: boolean;
}

// Setup token interface
interface SetupToken {
  token: string;
  expiresAt: string;
  setupLink: string;
}

export default function ImmersiveLanding() {
  const [location, setLocation] = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<HTMLDivElement>(null);
  const communicationRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Setup detection state
  const [showSetupButton, setShowSetupButton] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  const [setupLink, setSetupLink] = useState<string>('/setup');

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop,
        behavior: "smooth",
      });
    }
  };

  // Check if first-time setup is needed
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        console.log('🔍 Checking setup status...');
        const response = await get<{data: BootstrapStatus}>('/api/setup/status');
        const status = response.data.data; // API wraps response in data.data structure
        console.log('📊 Setup status response:', status);
        
        // Show setup button if in bootstrap mode and first-time setup is needed
        if (status.isBootstrapMode && status.isFirstTimeSetup) {
          console.log('✅ Bootstrap mode detected - fetching setup token...');
          
          try {
            // Fetch the current setup token with explicit headers
            console.log('🔄 Fetching setup token...');
            const tokenResponse = await get('/api/setup/token', undefined, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            console.log('📦 Raw token response:', tokenResponse);
            
            const setupToken = tokenResponse.data.data; // API wraps response in data.data structure
            console.log('🔑 Setup token received:', setupToken.setupLink);
            
            // Set the proper setup link with token
            setSetupLink(setupToken.setupLink);
            setShowSetupButton(true);
          } catch (tokenErr) {
            console.error('❌ Failed to fetch setup token:', tokenErr);
            // Fallback to basic setup link (user will need to use console link)
            setSetupLink('/setup');
            setShowSetupButton(true);
          }
        } else {
          console.log('❌ Setup not needed - bootstrap mode:', status.isBootstrapMode, 'first time:', status.isFirstTimeSetup);
        }
      } catch (err) {
        // If API call fails, assume setup might be needed
        console.error('❌ Setup status check failed:', err);
        console.log('🔧 Assuming setup is needed - showing setup button');
        setShowSetupButton(true);
        setSetupLink('/setup'); // Fallback
      } finally {
        setSetupChecked(true);
      }
    };

    checkSetupStatus();
  }, []);

  // Track mouse position for bubble effects with throttling to reduce CPU usage
  useEffect(() => {
    // Set up a shared mouse state object that will be used by the canvas animations
    const sharedMouseState = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      active: false
    };
    
    // Expose to window for canvas components to access (will be cleaned up on unmount)
    (window as any).__particleMouseState = sharedMouseState;
    
    // Create throttled mouse move handler with minimal processing
    const throttledHandleMouseMove = throttle((e: MouseEvent) => {
      // Only update the shared state object - no state changes or DOM updates here
      sharedMouseState.x = e.clientX;
      sharedMouseState.y = e.clientY;
      sharedMouseState.active = true;
      
      // Only update React state when needed for components that require it
      setMousePosition({ x: e.clientX, y: e.clientY });
    }, 100); // Increased throttle to 100ms for better performance
    
    // Mouse leave handler
    const handleMouseLeave = () => {
      sharedMouseState.active = false;
    };
    
    // Use passive listeners for better performance
    window.addEventListener("mousemove", throttledHandleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    
    return () => {
      // Clean up all event listeners and shared state
      window.removeEventListener("mousemove", throttledHandleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      delete (window as any).__particleMouseState;
      
      // Ensure throttle timers are cleared
      const cancelThrottle = throttledHandleMouseMove as ThrottledFunction;
      if (cancelThrottle.cancel) {
        cancelThrottle.cancel();
      }
    };
  }, []);

  // Setup animations - optimized for better performance
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Clear any existing ScrollTriggers
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    // Create a single master timeline for better performance
    const masterTimeline = gsap.timeline();
    
    const ctx = gsap.context(() => {
      // Hero animations - combined into a single timeline
      if (heroRef.current) {
        // Hero animations with element existence checks - prevents console errors
        const heroTitleChars = document.querySelectorAll(".hero-title .char");
        const heroSubtitle = document.querySelector(".hero-subtitle");
        const heroButtons = document.querySelector(".hero-buttons");
        
        // Only animate elements that exist
        if (heroTitleChars.length > 0) {
          masterTimeline.from(".hero-title .char", {
            opacity: 0,
            y: 50,
            stagger: 0.02,
            duration: 0.8,
            ease: "power3.out",
          }, 0.5);
        }
        
        if (heroSubtitle) {
          masterTimeline.from(".hero-subtitle", {
            opacity: 0,
            y: 20,
            duration: 0.7,
            ease: "power2.out"
          }, heroTitleChars.length > 0 ? 1.3 : 0.5);
        }
        
        if (heroButtons) {
          masterTimeline.from(".hero-buttons", {
            opacity: 0,
            y: 15,
            duration: 0.6,
            ease: "power2.out"
          }, (heroTitleChars.length > 0 || heroSubtitle) ? 1.6 : 0.5);
        }

        // Optimized background parallax - using a single scrollTrigger for better performance
        const parallaxTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true, // Simplified scrubbing
            invalidateOnRefresh: false, // Prevent unnecessary recalculations
          }
        });
          
        // Background parallax with element existence checks
        const bgElement1 = document.querySelector(".bg-element-1");
        const bgElement2 = document.querySelector(".bg-element-2");
        
        if (bgElement1) {
          parallaxTimeline.to(".bg-element-1", { y: "-15%" }, 0);
        }
        if (bgElement2) {
          parallaxTimeline.to(".bg-element-2", { y: "-25%" }, 0);
        }
      }

      // Problem section animations with element existence checks
      if (problemRef.current) {
        const floatingPapers = document.querySelectorAll(".floating-paper");
        
        // Only animate floating papers if they exist
        if (floatingPapers.length > 0) {
          gsap.to(".floating-paper", {
            y: "-15px",
            rotation: 3,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: 0.1,
          });
        }

        // Combine section animations into a timeline for better performance
        const problemTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: problemRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          }
        });

        // Section title reveal with element check
        const problemTitle = document.querySelector(".problem-title");
        if (problemTitle) {
          problemTimeline.from(".problem-title", {
            opacity: 0,
            y: 30,
            duration: 0.7,
          }, 0);
        }

        // Chaotic elements - optimized by using a single timeline instead of individual animations
        const chaosElements = document.querySelectorAll(".chaos-element");
        
        // Calculate maximum number of elements to animate (limit for performance)
        const maxElements = Math.min(chaosElements.length, 8);
        
        // Process only a limited number of elements for better performance
        for (let i = 0; i < maxElements; i++) {
          const element = chaosElements[i];
          problemTimeline.from(element, {
            scale: 0.5, // Start from 0.5 scale instead of 0 for less intensive transform
            opacity: 0,
            rotation: -5 + i * 2, // Deterministic rotation instead of random
            duration: 0.5, // Shorter duration
            ease: "power1.out", // Simpler ease function
          }, 0.1 + (i * 0.05)); // Smaller stagger with consistent pattern
        }
        
        // We're using the timeline's scrollTrigger defined above
        // No need for individual element scrollTriggers
      }

      // Solution section animations - optimized for better performance
      if (solutionRef.current) {
        // Create a unified timeline for all solution section animations
        const solutionTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: solutionRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          }
        });
        
        // Section title reveal with element check
        const solutionTitle = document.querySelector(".solution-title");
        if (solutionTitle) {
          solutionTimeline.from(".solution-title", {
            opacity: 0,
            y: 30,
            duration: 0.7,
          }, 0);
        }

        // Organized elements - using timeline instead of individual animations
        const solutionElements = document.querySelectorAll(".solution-element");
        const maxElements = Math.min(solutionElements.length, 10); // Limit max elements
        
        for (let i = 0; i < maxElements; i++) {
          const element = solutionElements[i];
          solutionTimeline.from(element, {
            x: i % 2 === 0 ? -50 : 50, // Reduced movement distance
            opacity: 0,
            duration: 0.6, // Faster animation
            ease: "power2.out", // Simpler ease function
          }, 0.2 + (i * 0.08)); // Smaller, consistent stagger
        }
      }

      // Transport section animations - optimized for better performance
      if (transportRef.current) {
        // Create a single timeline for all transport animations
        const transportTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: transportRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          }
        });
        
        // Vehicles animation - combined into timeline
        transportTimeline.fromTo(
          ".vehicle-element",
          { 
            x: -100, // Reduced movement distance
            opacity: 0 
          },
          {
            x: 0,
            opacity: 1,
            stagger: 0.15, // Reduced stagger time
            duration: 0.6, // Faster animation
            ease: "power2.out", // Simpler ease function
          },
          0 // Start at beginning of timeline
        );

        // Route animation - added to same timeline
        transportTimeline.from(".route-path", {
          strokeDashoffset: 500, // Reduced animation distance
          duration: 1.5, // Shorter duration
          ease: "power1.inOut", // Simpler ease function
        }, 0.3); // Start slightly after vehicles
      }

      // Communication section animations - optimized for better performance
      if (communicationRef.current) {
        // Create a single timeline for all communication animations
        const commTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: communicationRef.current,
            start: "top 75%", // Start animation earlier
            toggleActions: "play none none none",
            once: true, // Only play once to save resources
          }
        });
        
        // Add simple animation with minimal property changes
        // Avoid setting default values before animation to reduce initial DOM updates
        commTimeline.fromTo(
          ".message-bubble",
          { 
            scale: 0.95, // Less scale change
            opacity: 0.8 // Less opacity change 
          },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4, // Shorter duration
            stagger: 0.08, // Less stagger time
            ease: "power1.out", // Simpler ease function
          }
        );
      }

      // CTA section animations - optimized for better performance
      if (ctaRef.current) {
        // Use CSS animations for pulsing effects instead of GSAP
        // GSAP animations with continuous repeats can be CPU intensive
        
        // Instead of continuous GSAP animation, add a single timeline with limited animation
        const ctaTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 80%",
            once: true, // Only play once to save resources
          }
        });
        
        // CTA content animation with element existence check
        const ctaContent = document.querySelector(".cta-content");
        if (ctaContent) {
          ctaTimeline.from(".cta-content", {
            opacity: 0,
            y: 20,
            duration: 0.6,
            ease: "power2.out"
          });
        }
        
        // Add class for CSS animation instead of GSAP animation for button pulse
        document.querySelectorAll(".cta-button").forEach(button => {
          button.classList.add("pulse-animation");
        });
      }
    }, pageRef);

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      ctx.revert();
    };
  }, []);

  // Using our new memory-optimized night sky animation component
  // This replaces the previous bubble effect with an elegant gold particle night sky
  const backgroundEffects = useMemo(() => {
    // Only create animation on client side
    if (typeof window === 'undefined') return null;
    
    // Gold color from design system
    const goldColor = "hsl(var(--secondary))";
    
    return (
      <div 
        id="background-effects-container" 
        key="background-effects-container"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          pointerEvents: 'none', 
          zIndex: 40 
        }}
        aria-hidden="true"
      >
        {/* 
          Memory-optimized night sky animation
          - Uses canvas rendering for optimal performance
          - Implements typed arrays for memory efficiency
          - Frame rate limiting (30fps max)
          - Uses passive event listeners with cleanup
          - Features shooting stars and gentle twinkling
          - Gold particles matching the wedding theme
        */}
        <NightSky 
          starCount={150}           // Moderate star count for performance
          shootingStarCount={8}     // Increased number of shooting stars
          color={goldColor}         // Gold color matching wedding theme
          moonGlow={false}          // Disabled moon glow effect as requested
        />
      </div>
    );
  }, []); // Only create animation once for better performance

  // Add mouse movement effect with throttling for performance
  useEffect(() => {
    // Based on heap snapshot analysis, we're moving mouse tracking to a shared object pattern
    // instead of using DOM manipulation which creates many object references
    if (typeof window === 'undefined') return;
    
    // Create a shared mouse position object that can be accessed by canvas renderer
    // This significantly reduces memory by avoiding separate state, transforms, and style recalculations
    const sharedMouseState = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      active: false
    };
    
    // Make it accessible to the canvas renderer
    (window as any).__particleMouseState = sharedMouseState;
    
    // Only update raw coordinates without any calculations or DOM manipulations
    // This eliminates style recalculation, layout, and paint operations
    const handleMouseMove = (e: MouseEvent) => {
      sharedMouseState.x = e.clientX;
      sharedMouseState.y = e.clientY;
      sharedMouseState.active = true;
      
      // Find canvas element and tell it to use this state
      const canvas = document.querySelector('#particles-container canvas');
      if (canvas) {
        (canvas as any).__mouseState = sharedMouseState;
      }
    };
    
    // Track when mouse leaves window
    const handleMouseLeave = () => {
      sharedMouseState.active = false;
    };
    
    // Use passive flags and minimal event listeners
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    
    return () => {
      // Comprehensive cleanup of all references
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      delete (window as any).__particleMouseState;
    };
  }, []);

  return (
    <div ref={pageRef} className="immersive-landing">
      {/* Optimized background animation with bubble effect */}
      {backgroundEffects}

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <h1 className="font-great-vibes text-black text-3xl">
              Eternally Yours
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection(SECTIONS.PROBLEM)}
              className="text-[#5E239D] hover:text-[#5E239D]/80 text-sm font-medium"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection(SECTIONS.SOLUTION)}
              className="text-[#5E239D] hover:text-[#5E239D]/80 text-sm font-medium"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection(SECTIONS.COMMUNICATION)}
              className="text-[#5E239D] hover:text-[#5E239D]/80 text-sm font-medium"
            >
              Communication
            </button>
            <Link
              href="/auth"
              className="bg-[#5E239D] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#5E239D]/90 transition-colors"
            >
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-[#5E239D]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </div>
      </nav>


      {/* First-Time Setup Button - appears when setup is needed */}
      {showSetupButton && (
        <div className="fixed top-20 right-6 z-50 animate-pulse">
          <div className="bg-gradient-to-r from-[#5E239D] to-[#7f33d3] text-white p-4 rounded-lg shadow-2xl border border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">First-Time Setup</h3>
                <p className="text-xs text-white/80">Quick visual setup required</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm"
              onClick={() => {
                console.log('🚀 Setup button clicked - navigating to:', setupLink);
                // Use direct URL navigation to handle token parameters properly
                window.location.href = setupLink;
              }}
            >
              Start Setup Wizard
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        id={SECTIONS.HERO}
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#5E239D] scroll-section"
      >
        {/* Background Elements - Parallax Effect */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Glowing orbs */}
          <div className="parallax-layer" data-speed="0.2">
            <div className="absolute w-[700px] h-[700px] rounded-full bg-gradient-to-r from-[#7f33d3]/10 to-[#5E239D]/5 blur-3xl -top-64 -left-64"></div>
          </div>
          <div className="parallax-layer" data-speed="0.3">
            <div className="absolute w-[900px] h-[900px] rounded-full bg-gradient-to-r from-[#BFA76F]/10 to-[#e9d9a8]/5 blur-3xl -bottom-96 -right-96"></div>
          </div>

          {/* Decorative patterns */}
          <div
            className="parallax-layer absolute inset-0 opacity-5 pointer-events-none"
            data-speed="0.1"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/patterns/mandala-pattern.svg')] bg-repeat opacity-10"></div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Main headline with text gradient */}
          <h1 className="mb-8">
            <span className="block text-6xl md:text-8xl font-['Great_Vibes'] text-gradient tracking-wider py-4">
              Eternally Yours
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-xl mb-12 text-white/80 max-w-3xl mx-auto leading-relaxed">
            Eternally Yours RSVP Platform - The most elegant wedding management platform for Indian weddings.
            From the first RSVP to the final farewell, your big fat Indian
            wedding without breaking a sweat....or a spreadsheet.
          </p>

          {/* Call to action buttons */}
          <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="hero-button hero-button-primary rounded-full py-6 px-10 text-base font-medium bg-gradient-to-r from-primary to-primary/80 border-0 shadow-lg shadow-primary/20"
              asChild
            >
              <Link href="/auth">Get Started</Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="hero-button hero-button-secondary rounded-full py-6 px-10 text-base font-medium backdrop-blur-md bg-white/5 border-accent/30"
              onClick={() => scrollToSection(SECTIONS.PROBLEM)}
            >
              See How It Works
            </Button>
          </div>
        </div>

        {/* Elegant floating scroll indicator with gold accent */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="relative w-8 h-12 border border-accent/30 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-sm bg-white/5">
            <span className="absolute w-3 h-3 bg-gradient-to-b from-accent to-accent/80 rounded-full animate-bounce delay-300 duration-1000"></span>
          </div>
          <span className="text-xs font-light text-accent/70 mt-2 tracking-wider uppercase">
            Scroll to explore
          </span>
        </div>
      </section>

      {/* Problem Section - The Wedding Planning Chaos */}
      <section
        id={SECTIONS.PROBLEM}
        ref={problemRef}
        className="relative py-24 bg-background text-primary scroll-section"
      >
        <div className="container mx-auto px-6">
          <h2 className="problem-title text-center mb-10">
            <span className="text-accent font-light text-base block">
              Behind the Scenes:
            </span>
            <span className="text-3xl md:text-4xl font-serif font-bold text-primary">
              A Symphony or a Storm?
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Visual illustration exactly matching reference screenshot */}
            <div className="relative flex justify-center items-center">
              <div className="relative max-w-md">
                {/* Centered smartphone mockup with paper notes on sides */}
                <div className="relative z-20 flex justify-center">
                  {/* Smartphone mockup */}
                  <div className="w-[160px] h-[280px] bg-gray-800 rounded-3xl p-2 z-20">
                    <div className="w-full h-full bg-white rounded-2xl overflow-hidden"></div>
                  </div>

                  {/* Blue paper note - left */}
                  <div className="absolute -left-20 top-8 w-36 h-44 bg-[#89CFF0] rounded-sm transform -rotate-6 z-10">
                    <div className="p-2">
                      <div className="w-full h-2 bg-white/40 rounded-full mt-4 mb-2"></div>
                      <div className="w-24 h-2 bg-white/40 rounded-full mb-2"></div>
                      <div className="w-28 h-2 bg-white/40 rounded-full mb-2"></div>
                      <div className="w-20 h-2 bg-white/40 rounded-full mb-2"></div>
                      <div className="w-24 h-2 bg-white/40 rounded-full mb-2"></div>
                    </div>
                  </div>

                  {/* Yellow paper note - right */}
                  <div className="absolute -right-20 top-2 w-40 h-48 bg-[#FDFD96] rounded-sm transform rotate-6 z-10">
                    <div className="p-2">
                      <div className="w-full h-2 bg-yellow-600/20 rounded-full mt-4 mb-2"></div>
                      <div className="w-28 h-2 bg-yellow-600/20 rounded-full mb-2"></div>
                      <div className="w-32 h-2 bg-yellow-600/20 rounded-full mb-2"></div>
                      <div className="w-24 h-2 bg-yellow-600/20 rounded-full mb-2"></div>
                      <div className="w-30 h-2 bg-yellow-600/20 rounded-full mb-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content area - right side - exactly matching reference */}
            <div className="text-[#5E239D] space-y-6">
              <p className="text-sm leading-relaxed">
                Indian Weddings are Breathtaking - Literally Behind Every
                Stunning Sangeet, lies multiple spreadsheets of guests
                information, calls, confusions and dozens of WhatsApp Groups.
              </p>

              <div className="space-y-5 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 mt-1"></div>
                  <p className="text-xs">
                    Managing RSVPs from hundreds of guests across different
                    events becomes overwhelming
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 mt-1"></div>
                  <p className="text-xs">
                    Logistics planning leads to endless spreadsheets, phone
                    calls and sleepless nights
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 mt-1"></div>
                  <p className="text-xs">Transport Drama and Hotel Mix-ups</p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 mt-1"></div>
                  <p className="text-xs">
                    Missed Messages, Lost itineraries, and confused aunties - We
                    feel you!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - Elegant Simplicity */}
      <section
        id={SECTIONS.SOLUTION}
        ref={solutionRef}
        className="relative py-24 bg-background text-primary scroll-section"
      >
        <div className="container mx-auto px-6">
          <h2 className="solution-title text-center mb-10">
            <span className="text-accent font-light text-base block">
              Elegant Simplicity
            </span>
            <span className="text-3xl md:text-4xl font-serif font-bold text-primary">
              in Every Detail
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-primary space-y-5 order-2 md:order-1">
              <p className="text-base md:text-lg leading-relaxed">
                Designed from the ground up by wedding planners, our all-in-one
                platform removes the noise, so that you can plan with clarity
                and celebrate with your heart.
              </p>

              <div className="space-y-4 mt-8">
                <div className="solution-element p-4 rounded-md bg-primary/5 border-l-4 border-primary">
                  <h3 className="font-medium text-lg mb-2">
                    One Dashboard, Total Control
                  </h3>
                  <p className="text-base text-primary/80 leading-relaxed">
                    Manage guests, logistics, travel, accommodation,
                    communication & more all in one place.
                  </p>
                </div>

                <div className="solution-element p-4 rounded-md bg-accent/5 border-l-4 border-accent">
                  <h3 className="font-medium text-lg mb-2">
                    Family-Centered Design
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed">
                    Keep families together in travel, seating, and communication
                  </p>
                </div>

                <div className="solution-element p-4 rounded-md bg-primary/5 border-l-4 border-primary">
                  <h3 className="font-medium text-lg mb-2">
                    From Save the Date to Departure
                  </h3>
                  <p className="text-base text-primary/80 leading-relaxed">
                    Seamlessly manage the entire wedding lifecycle.
                  </p>
                </div>

                <div className="solution-element p-4 rounded-md bg-accent/5 border-l-4 border-accent">
                  <h3 className="font-medium text-lg mb-2">
                    Integrated Communication
                  </h3>
                  <p className="text-base text-foreground/80 leading-relaxed">
                    Email and WhatsApp integration for seamless guest updates
                    and communication.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative order-1 md:order-2">
              <div className="solution-element relative mx-auto w-[320px] h-[600px] bg-background rounded-[36px] border-8 border-border shadow-xl overflow-hidden">
                <div className="absolute top-0 w-full h-6 bg-border rounded-t-lg"></div>
                <div className="absolute bottom-0 w-full h-6 bg-border rounded-b-lg"></div>

                <div className="h-full overflow-hidden">
                  <div className="h-14 w-full bg-primary flex items-center justify-between px-4">
                    <div className="text-white font-medium">
                      Eternally Yours
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/20"></div>
                  </div>

                  <div className="p-3 bg-gray-100 h-[calc(100%-3.5rem)]">
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="w-36 h-5 bg-gray-200 rounded"></div>
                        <div className="w-16 h-5 bg-primary/20 rounded-full"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-3 bg-gray-100 rounded"></div>
                        <div className="w-5/6 h-3 bg-gray-100 rounded"></div>
                        <div className="w-4/6 h-3 bg-gray-100 rounded"></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <div className="w-20 h-6 bg-primary/10 rounded-full"></div>
                        <div className="w-20 h-6 bg-accent/10 rounded-full"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 mb-2 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 mb-2 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
                      <div className="flex justify-between items-center mb-3">
                        <div className="w-24 h-4 bg-gray-200 rounded"></div>
                        <div className="w-6 h-6 rounded-full bg-primary/10"></div>
                      </div>
                      <div className="flex gap-2 items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                        <div>
                          <div className="w-20 h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="w-16 h-2 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                        <div>
                          <div className="w-24 h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="w-16 h-2 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                        <div>
                          <div className="w-28 h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="w-16 h-2 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-3">
                      <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-md mb-2"></div>
                      <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                      <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transport Section */}
      <section
        id={SECTIONS.TRANSPORT}
        ref={transportRef}
        className="relative py-24 bg-white"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-center mb-10">
            <span className="text-[#BFA76F] font-light text-base block">
              Travel Solutions
            </span>
            <span className="text-3xl md:text-4xl font-serif font-bold text-[#5E239D]">
              Moving Together
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-[400px]">
              {/* SVG Map with Routes */}
              <svg
                className="w-full h-full"
                viewBox="0 0 800 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Map Background */}
                <rect width="800" height="600" fill="#f8f9fa" rx="8" />

                {/* Roads */}
                <path
                  className="route-path"
                  d="M100,300 C200,200 300,400 400,300 S600,200 700,300"
                  stroke="#d1d5db"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="0"
                />
                <path
                  className="route-path"
                  d="M200,100 C250,200 350,250 400,300"
                  stroke="#d1d5db"
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="0"
                />
                <path
                  className="route-path"
                  d="M600,100 C550,200 450,250 400,300"
                  stroke="#d1d5db"
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="0"
                />
                <path
                  className="route-path"
                  d="M400,300 L400,500"
                  stroke="#d1d5db"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="0"
                />

                {/* Primary Route */}
                <path
                  className="route-path"
                  d="M100,300 C200,200 300,400 400,300 S600,200 700,300"
                  stroke="#5E239D"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="0"
                />

                {/* Airport */}
                <circle
                  cx="100"
                  cy="300"
                  r="30"
                  fill="#e0f2fe"
                  stroke="#7dd3fc"
                  strokeWidth="4"
                />
                <path
                  d="M85,300 L115,300 M100,285 L100,315 M80,280 L120,320"
                  stroke="#0284c7"
                  strokeWidth="3"
                />

                {/* Hotel */}
                <rect
                  x="370"
                  y="270"
                  width="60"
                  height="60"
                  rx="4"
                  fill="#f0fdf4"
                  stroke="#86efac"
                  strokeWidth="4"
                />
                <path
                  d="M385,300 L415,300 M400,285 L400,315"
                  stroke="#16a34a"
                  strokeWidth="3"
                />

                {/* Venue */}
                <circle
                  cx="700"
                  cy="300"
                  r="30"
                  fill="#fef3c7"
                  stroke="#fcd34d"
                  strokeWidth="4"
                />
                <path
                  d="M685,300 L715,300 M700,285 L700,315 M685,285 L715,315 M685,315 L715,285"
                  stroke="#f59e0b"
                  strokeWidth="3"
                />

                {/* Vehicles */}
                <g className="vehicle-element" transform="translate(200, 250)">
                  <rect
                    x="0"
                    y="0"
                    width="40"
                    height="20"
                    rx="5"
                    fill="#5E239D"
                  />
                  <circle cx="10" cy="20" r="5" fill="#1e293b" />
                  <circle cx="30" cy="20" r="5" fill="#1e293b" />
                </g>

                <g className="vehicle-element" transform="translate(350, 350)">
                  <rect
                    x="0"
                    y="0"
                    width="50"
                    height="25"
                    rx="5"
                    fill="#BFA76F"
                  />
                  <circle cx="15" cy="25" r="6" fill="#1e293b" />
                  <circle cx="35" cy="25" r="6" fill="#1e293b" />
                </g>

                <g className="vehicle-element" transform="translate(500, 250)">
                  <rect
                    x="0"
                    y="0"
                    width="60"
                    height="30"
                    rx="5"
                    fill="#5E239D"
                  />
                  <circle cx="15" cy="30" r="7" fill="#1e293b" />
                  <circle cx="45" cy="30" r="7" fill="#1e293b" />{" "}
                </g>

                {/* Labels */}
                <text
                  x="100"
                  y="360"
                  textAnchor="middle"
                  fill="#0284c7"
                  fontSize="16"
                  fontWeight="500"
                >
                  Airport
                </text>
                <text
                  x="400"
                  y="360"
                  textAnchor="middle"
                  fill="#16a34a"
                  fontSize="16"
                  fontWeight="500"
                >
                  Hotel
                </text>
                <text
                  x="700"
                  y="360"
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="16"
                  fontWeight="500"
                >
                  Venue
                </text>
              </svg>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl md:text-3xl font-serif font-semibold mb-4 text-[#5E239D]">
                Family-Centric Transportation
              </h3>

              <p className="text-base md:text-lg leading-relaxed text-[#5E239D]/80">
                Our revolutionary transport management system ensures that
                families travel together comfortably, with intelligent
                allocation based on arrival times and group sizes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <Card className="p-4 border border-border/50 bg-card">
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium mb-2">
                      Smart Fleet Management
                    </h4>
                    <p className="text-foreground/70 text-sm flex-grow">
                      Define your available fleet with vehicle types and
                      capacities
                    </p>
                  </div>
                </Card>

                <Card className="p-4 border border-border/50 bg-card">
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium mb-2">
                      Family Grouping
                    </h4>
                    <p className="text-foreground/70 text-sm flex-grow">
                      Automatically keep families together in the same vehicle
                    </p>
                  </div>
                </Card>

                <Card className="p-4 border border-border/50 bg-card">
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium mb-2">
                      Arrival Optimization
                    </h4>
                    <p className="text-foreground/70 text-sm flex-grow">
                      Group travelers by arrival time to optimize vehicle usage
                    </p>
                  </div>
                </Card>

                <Card className="p-4 border border-border/50 bg-card">
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium mb-2">
                      Effortless Notifications
                    </h4>
                    <p className="text-foreground/70 text-sm flex-grow">
                      Automated updates about pickup times and locations for
                      Guests, Delayed flight notifications for planners and
                      more.
                    </p>
                  </div>
                </Card>
              </div>

              <Button
                className="mt-8"
                onClick={() => scrollToSection(SECTIONS.COMMUNICATION)}
              >
                Explore Guest Communication
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Communication Section */}
      <section
        id={SECTIONS.COMMUNICATION}
        ref={communicationRef}
        className="relative py-24 bg-primary"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-center mb-10">
            <span className="text-accent font-light text-base block">
              Guest Communications
            </span>
            <span className="text-white font-serif text-3xl md:text-4xl font-bold">
              Multichannel Guest Engagement
            </span>
          </h2>

          <p className="text-white/80 text-center max-w-2xl mx-auto mb-12 text-base md:text-lg leading-relaxed">
            Keep your guests informed and engaged through personalized WhatsApp
            messages and email communications. Automate responses with AI
            Chatbots.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-lg mb-1">
                      WhatsApp & AI Chatbots
                    </h4>
                    <p className="text-foreground/70">
                      Send updates, collect RSVPs, and answer questions through
                      WhatsApp and AI Chatbots.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-lg mb-1">
                      Beautiful Email Templates
                    </h4>
                    <p className="text-foreground/70">
                      Send elegant, branded emails for invitations and updates
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-lg mb-1">
                      Automated Reminders
                    </h4>
                    <p className="text-foreground/70">
                      Schedule timely reminders for transportation and events
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-white shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-lg mb-1">
                      Dynamic Follow-Ups
                    </h4>
                    <p className="text-foreground/70">
                      Personalized follow-up based on guest responses
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium">Sharma & Patel Wedding</h5>
                    <p className="text-xs text-foreground/70">
                      WhatsApp Communication
                    </p>
                  </div>
                </div>

                <div className="py-4 space-y-4 bg-gray-50 rounded-lg">
                  <div className="message-bubble flex justify-start">
                    <div className="bg-gray-300 rounded-lg p-3 max-w-[80%] shadow">
                      <p className="text-sm text-gray-900 font-medium">
                        Namaste Priya! We're excited to welcome you to Raj &
                        Anita's wedding celebration. Your RSVP has been
                        confirmed for all 3 days of ceremonies.
                      </p>
                    </div>
                  </div>

                  <div className="message-bubble flex justify-end">
                    <div className="bg-green-400 rounded-lg p-3 max-w-[80%] shadow">
                      <p className="text-sm text-gray-900 font-medium">
                        Thank you! I'm looking forward to it. Will there be
                        transportation from the hotel to the venue?
                      </p>
                    </div>
                  </div>

                  <div className="message-bubble flex justify-start">
                    <div className="bg-gray-300 rounded-lg p-3 max-w-[80%] shadow">
                      <p className="text-sm text-gray-900 font-medium">
                        Yes! We've arranged transportation for you. A car will
                        pick you up from JW Marriott at 5:30 PM on Friday. We've
                        made sure you'll be with your family members.
                      </p>
                    </div>
                  </div>

                  <div className="message-bubble flex justify-start">
                    <div className="bg-gray-300 rounded-lg p-3 max-w-[80%] space-y-2 shadow">
                      <p className="text-sm text-gray-900 font-medium">
                        Here are the transportation details:
                      </p>
                      <div className="bg-white rounded-md p-2 text-sm border border-gray-300">
                        <p className="font-medium text-gray-900">
                          🚗 Your Transport Details
                        </p>
                        <p className="text-xs mt-1 text-gray-900">
                          Date: June 17, 2025
                        </p>
                        <p className="text-xs text-gray-900">
                          Pickup: JW Marriott, 5:30 PM
                        </p>
                        <p className="text-xs text-gray-900">
                          Vehicle: White Innova (Sharma Family)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="message-bubble flex justify-end">
                    <div className="bg-green-400 rounded-lg p-3 max-w-[80%] shadow">
                      <p className="text-sm text-gray-900 font-medium">
                        Perfect! Thank you for organizing this so well.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <div className="bg-gray-100 rounded-full flex-grow p-2 text-sm text-gray-400">
                    Type a message...
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id={SECTIONS.CTA}
        ref={ctaRef}
        className="relative py-24 bg-[#5E239D]"
      >
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white">
            Begin Your <span className="text-white">Journey</span>
          </h2>

          <p className="text-lg text-white max-w-3xl mx-auto mb-12">
            Transform your wedding planning experience today. Our platform
            brings elegance to every detail, letting you focus on what truly
            matters.
          </p>

          <Button
            size="lg"
            className="hero-button hero-button-primary rounded-full py-6 px-10 text-lg font-medium bg-gradient-to-r from-[#5E239D] to-[#7f33d3] border-0 shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/auth">Get Started Now</Link>
          </Button>

          <p className="text-white/70 mt-6">
            Plan your wedding with Grace and Ease. Not Google Sheets!
          </p>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-black py-6">
        <div className="container mx-auto px-6">
          <p className="text-white/80 text-center text-sm">
            Made with ❤️ by CultureBot Experiences and Entertainment. All Rights
            Reserved @2025.
          </p>
          <p className="text-white/60 text-center text-sm mt-2">
            <a href="mailto:info@culturebot.in" className="hover:text-white/80 transition-colors">
              info@culturebot.in
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
