import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

type StoryElementProps = {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  background?: string;
  textColor?: string;
  className?: string;
};

/**
 * A simplified component for storytelling sections with built-in animations
 * that work reliably without complex dependencies
 */
export const StorySection: React.FC<StoryElementProps> = ({
  id,
  title,
  subtitle,
  children,
  background = 'bg-black',
  textColor = 'text-white',
  className = '',
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Simple fade-in animation on scroll
  useEffect(() => {
    if (!sectionRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add visible class when section becomes visible
            entry.target.classList.add('section-visible');
            
            // Also animate internal content
            if (contentRef.current) {
              gsap.fromTo(
                contentRef.current.children,
                { 
                  y: 30, 
                  opacity: 0 
                },
                { 
                  y: 0, 
                  opacity: 1, 
                  stagger: 0.1, 
                  duration: 0.8,
                  ease: "power2.out" 
                }
              );
            }
          } else {
            // Remove visible class when section is out of view
            entry.target.classList.remove('section-visible');
          }
        });
      },
      {
        rootMargin: "-10% 0px -10% 0px",
        threshold: 0.15, // Trigger when 15% visible
      }
    );
    
    // Observe the section
    observer.observe(sectionRef.current);
    
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);
  
  return (
    <section
      id={id}
      ref={sectionRef}
      className={`min-h-screen flex items-center justify-center py-20 relative overflow-hidden ${background} ${textColor} ${className} transition-opacity duration-700 opacity-0 section-fade`}
    >
      {/* Visual connector to create continuity between sections */}
      <div className="absolute top-0 left-1/2 w-px h-20 bg-gradient-to-b from-transparent to-white/20 transform -translate-x-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-10 w-full">
        <div ref={contentRef} className="space-y-12">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{title}</h2>
            {subtitle && (
              <p className="text-xl md:text-2xl opacity-80 max-w-3xl mx-auto">{subtitle}</p>
            )}
          </div>
          
          {/* Section content */}
          <div>{children}</div>
        </div>
      </div>
      
      {/* Visual connector to create continuity between sections */}
      <div className="absolute bottom-0 left-1/2 w-px h-20 bg-gradient-to-t from-transparent to-white/20 transform -translate-x-1/2"></div>
    </section>
  );
};