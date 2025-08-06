import React, { useRef, useEffect, useMemo, memo } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Only register if window exists to avoid SSR issues
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ParallaxTextProps {
  text: string;
  subtext?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large' | 'xl';
  gradient?: boolean;
  reveal?: boolean;
  className?: string;
  animationMode?: 'stagger' | 'reveal' | 'chars' | 'cinema';
  speed?: number;
  headingElement?: 'h1' | 'h2' | 'h3' | 'h4';
  debug?: boolean;
}

// Using memo to prevent unnecessary re-renders
export const ParallaxText: React.FC<ParallaxTextProps> = memo(({
  text,
  subtext,
  align = 'center',
  size = 'large',
  gradient = false,
  reveal = true,
  className,
  animationMode = 'stagger', // Default to simpler animation
  speed = 1,
  headingElement = 'h2',
  debug = false
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);
  
  // Split text function to handle both word and character splits
  // Memoized to prevent recreation on each render
  const splitTextElements = useMemo(() => {
    const shouldSplitChars = animationMode === 'chars';
    
    if (shouldSplitChars) {
      // Only split into individual characters when absolutely needed
      // This creates many DOM elements, so we use it sparingly
      return Array.from(text).map((char, index) => (
        <span key={index} className="char inline-block transform-gpu opacity-0">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    } else {
      // Normal word split for better performance (fewer DOM elements)
      return text.split(' ').map((word, index) => (
        <span key={index} className="word inline-block mr-[0.25em] transform-gpu opacity-0">
          {word}
        </span>
      ));
    }
  }, [text, animationMode]);
  
  // GSAP animation with optimized settings and proper cleanup
  useGSAP(() => {
    if (!textRef.current || typeof window === 'undefined') return;
    
    const container = textRef.current;
    const heading = headingRef.current;
    const subtitle = subtextRef.current;
    
    if (!heading) return;
    
    // Create GSAP context for proper cleanup
    gsapContextRef.current = gsap.context(() => {
      // Setup scroll animation with optimized settings
      const scrollConfig = {
        trigger: container,
        start: "top 85%", // Start slightly earlier
        end: "bottom 20%",
        toggleActions: "play none none reverse",
        markers: debug,
        once: animationMode === 'reveal', // Play once for certain animations
      };
      
      const words = container.querySelectorAll('.word');
      const chars = container.querySelectorAll('.char');
      
      // Create timeline with simplified defaults
      const tl = gsap.timeline({
        scrollTrigger: scrollConfig,
        defaults: { 
          ease: "power2.out", // Simpler easing function
          duration: 0.7 * (1 / speed) // Shorter duration
        }
      });
      
      // Create animations based on selected mode
      // Each mode is optimized for performance
      switch (animationMode) {
        case 'cinema':
          // Cinematic text reveal - simplified with fewer properties
          tl.set(words, { opacity: 0, y: 30 }); // Reduced y distance
          tl.to(words, {
            opacity: 1, 
            y: 0,
            stagger: {
              amount: 0.5, // Reduced stagger time
              from: "start",
              ease: "power2.out"
            },
          });
          
          // Simpler subtitle fade-in
          if (subtitle) {
            tl.fromTo(
              subtitle, 
              { opacity: 0, y: 15 }, // Reduced y distance
              { opacity: 1, y: 0, duration: 0.8 },
              0.3 // Start earlier
            );
          }
          
          // Add lighter parallax scroll effect
          gsap.to(container, {
            y: -30 * speed, // Reduced movement
            scrollTrigger: {
              trigger: container,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6, // Smoother scrub
              invalidateOnRefresh: false // Prevent unnecessary recalculations
            }
          });
          break;

        case 'chars':
          // Simplified character-by-character animation
          tl.set(chars, { opacity: 0, y: 15 }); // Removed rotateX for better performance
          tl.to(chars, {
            opacity: 1,
            y: 0,
            stagger: 0.015, // Reduced stagger time
            duration: 0.5 // Shorter duration
          });
          
          if (subtitle) {
            tl.fromTo(
              subtitle, 
              { opacity: 0 },
              { opacity: 1, duration: 0.6 }, // Shorter duration
              0.4
            );
          }
          break;

        case 'reveal':
          // Simplified reveal with less intensive mask effect
          gsap.set(heading, { 
            clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
            opacity: 1
          });
          
          tl.to(heading, {
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            duration: 1,
            ease: "power2.inOut" // Simpler ease function
          });
          
          if (subtitle) {
            gsap.set(subtitle, { opacity: 0 });
            tl.to(subtitle, {
              opacity: 1,
              duration: 0.6 // Shorter duration
            }, 0.3);
          }
          break;

        case 'stagger':
        default:
          // Simplified staggered reveal animation
          tl.to(words, {
            opacity: 1,
            y: 0,
            stagger: 0.05 * speed, // Reduced stagger time
            duration: 0.5 // Shorter duration
          });
          
          if (subtitle) {
            tl.fromTo(
              subtitle, 
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.6 }, // Shorter duration
              0.3
            );
          }
          
          // Lighter parallax scroll effect
          gsap.to(container, {
            y: -20 * speed, // Reduced movement
            scrollTrigger: {
              trigger: container,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8, // Smoother scrub
              invalidateOnRefresh: false // Prevent unnecessary recalculations
            }
          });
      }
    });
    
    // Proper cleanup with context reversion
    return () => {
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
      }
    };
  }, { scope: textRef, dependencies: [animationMode, speed, text, subtext] });
  
  // Memoized style classes to prevent recalculation
  const styleClasses = useMemo(() => {
    // Define text size classes
    const sizeClasses = {
      small: 'text-2xl md:text-3xl',
      medium: 'text-3xl md:text-5xl',
      large: 'text-4xl md:text-6xl lg:text-7xl',
      xl: 'text-5xl md:text-7xl lg:text-8xl'
    };
    
    // Define alignment classes
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    
    // Gradient text effect
    const gradientClass = gradient 
      ? 'bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 text-transparent bg-clip-text'
      : '';
      
    return {
      heading: `font-bold leading-tight relative ${sizeClasses[size]} ${alignClasses[align]} ${gradientClass}`,
      paragraph: `mt-4 text-lg md:text-xl opacity-0 ${alignClasses[align]}`
    };
  }, [size, align, gradient]);
  
  // Create the heading element based on headingElement prop
  const HeadingTag = headingElement as any;
  
  return (
    <div ref={textRef} className={`parallax-text overflow-hidden ${className || ''}`}>
      <HeadingTag 
        ref={headingRef}
        className={styleClasses.heading}
      >
        {splitTextElements}
      </HeadingTag>
      
      {subtext && (
        <p 
          ref={subtextRef}
          className={styleClasses.paragraph}
        >
          {subtext}
        </p>
      )}
    </div>
  );
});