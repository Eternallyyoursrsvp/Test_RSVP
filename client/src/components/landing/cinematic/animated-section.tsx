import React, { useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Ensure ScrollTrigger is registered
gsap.registerPlugin(ScrollTrigger);

interface AnimatedSectionProps {
  id: string;
  children: ReactNode;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: React.CSSProperties;
  animationType?: 'fade' | 'slide' | 'zoom' | 'parallax' | 'reveal' | 'cinematic'; 
  overlayOpacity?: number;
  pinned?: boolean;
  duration?: number;
  startTrigger?: string; // When to start animation ("top bottom", "center center", etc.)
  endTrigger?: string;   // When to end animation
  speed?: number;        // Parallax speed factor
  debug?: boolean;       // Show ScrollTrigger markers for debugging
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  id,
  children,
  backgroundImage,
  backgroundColor = '#000',
  textColor = 'white',
  style,
  animationType = 'fade',
  overlayOpacity = 0.5,
  pinned = false,
  duration = 1,
  startTrigger = "top bottom",
  endTrigger = "bottom top",
  speed = 1,
  debug = false
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    if (!sectionRef.current || !contentRef.current) return;
    
    // Enhanced GSAP configuration for this section with better timing
    const scrollConfig = {
      trigger: sectionRef.current,
      start: startTrigger,
      end: pinned ? `+=${window.innerHeight * 1.2}` : endTrigger,
      scrub: 0.5,
      markers: debug,
      pin: pinned,
      pinSpacing: true,
      toggleActions: "play none none reverse",
      anticipatePin: 1
    };
    
    // Prepare elements for animation
    const container = sectionRef.current;
    const content = contentRef.current;
    const bg = bgRef.current;
    
    // Create main timeline for this section
    const tl = gsap.timeline({ scrollTrigger: scrollConfig });
    
    // Element to split text for word-by-word animation
    const headings = content.querySelectorAll('h1, h2, h3, h4');
    const paragraphs = content.querySelectorAll('p');
    
    // Split text elements for more cinematic animations if in cinematic mode
    if (animationType === 'cinematic') {
      // Split headings into words for more cinematic reveal
      headings.forEach(heading => {
        const text = heading.textContent || '';
        heading.innerHTML = '';
        text.split(' ').forEach((word, i) => {
          const span = document.createElement('span');
          span.textContent = word + ' ';
          span.className = 'inline-block transform-gpu word';
          span.style.opacity = '0';
          span.style.transform = 'translateY(20px)';
          heading.appendChild(span);
        });
      });
      
      // Stagger animation for each word
      const words = content.querySelectorAll('.word');
      tl.to(words, {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.8,
        ease: "power3.out"
      }, 0);
      
      // Animate paragraphs with slight delay
      tl.fromTo(paragraphs, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power2.out" },
        0.3
      );
      
      // Add other elements with scale animation
      const otherElements = content.querySelectorAll('.animate-in:not(h1,h2,h3,h4,p,span)');
      tl.fromTo(otherElements,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, stagger: 0.1, duration: 0.7, ease: "power2.out" },
        0.5
      );
      
      // Add background parallax if there's a background
      if (bg) {
        // Create scale and position effect
        gsap.fromTo(bg, 
          { scale: 1.1, y: "-5%" },
          { 
            scale: 1.2, 
            y: "5%", 
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5
            }
          }
        );
      }
    } else {
      // Define animations based on original animation types
      switch (animationType) {
        case 'fade':
          tl.fromTo(content, 
            { opacity: 0 }, 
            { opacity: 1, duration: duration }
          );
          break;
            
        case 'slide':
          tl.fromTo(content, 
            { y: 100, opacity: 0 }, 
            { y: 0, opacity: 1, duration: duration, ease: "power2.out" }
          );
          break;
            
        case 'zoom':
          tl.fromTo(content, 
            { scale: 0.9, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: duration, ease: "power2.out" }
          );
          break;
            
        case 'parallax':
          // Background parallax effect
          if (bg) {
            tl.fromTo(bg, 
              { y: '-10%' }, 
              { y: '10%', ease: "none", duration: duration * speed }
            );
          }
          
          // Content parallax (slower than background)
          tl.fromTo(content, 
            { y: '5%' }, 
            { y: '-5%', ease: "none", duration: duration * (speed * 0.5) },
            0
          );
          break;
            
        case 'reveal':
          // Create a reveal mask effect
          gsap.set(content, { clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' });
          tl.to(content, { 
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', 
            duration: duration,
            ease: "power2.inOut"
          });
          
          // Also fade in to enhance the effect
          tl.fromTo(content, 
            { opacity: 0 }, 
            { opacity: 1, duration: duration * 0.6 },
            0.2
          );
          break;
      }
    }
    
    // Add scale effect when pinned for more dimension
    if (pinned) {
      gsap.fromTo(container,
        { scale: 0.98 },
        { 
          scale: 1, 
          ease: "power1.inOut",
          scrollTrigger: {
            trigger: container,
            start: "top bottom",
            end: "top top",
            scrub: true
          }
        }
      );
    }
    
    return () => {
      // Clean up animations when component unmounts
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, { scope: sectionRef, dependencies: [animationType, pinned, id] });

  return (
    <section
      id={id}
      ref={sectionRef}
      className="cinematic-section min-h-screen w-full relative flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor,
        color: textColor,
        ...style
      }}
      data-animation-type={animationType}
    >
      {/* Background with parallax effect */}
      {backgroundImage && (
        <div 
          ref={bgRef}
          className="section-background absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            transform: 'scale(1.2)'
          }}
        />
      )}
      
      {/* Overlay for better text contrast */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          backgroundColor: backgroundColor,
          opacity: overlayOpacity
        }}
      />
      
      {/* Content layer with animations */}
      <div 
        ref={contentRef}
        className="relative z-10 w-full max-w-7xl mx-auto p-8 md:px-16"
      >
        {children}
      </div>
    </section>
  );
};