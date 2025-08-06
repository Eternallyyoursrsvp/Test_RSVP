// Lazy import GSAP plugins to reduce initial bundle size and memory footprint
import React, { useRef, useEffect, ReactNode, memo } from 'react';
import { gsap } from 'gsap';

// Forward declarations for lazy-loaded plugins
let ScrollTrigger: any;
let ScrollToPlugin: any;

// Lazy loading GSAP plugins with optimized loading pattern
const loadGsapPlugins = async () => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Dynamic imports with type checking
    const ScrollTriggerModule = await import('gsap/ScrollTrigger');
    const ScrollToPluginModule = await import('gsap/ScrollToPlugin');
    
    // Store references globally to avoid re-importing
    ScrollTrigger = ScrollTriggerModule.ScrollTrigger;
    ScrollToPlugin = ScrollToPluginModule.ScrollToPlugin;
    
    // Register plugins
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    
    return true;
  } catch (error) {
    console.error('Failed to load GSAP plugins:', error);
    return false;
  }
};

interface ScrollContainerProps {
  children: ReactNode;
  debug?: boolean;
}

/**
 * Memory-optimized scroll container with minimal initialization
 */
export const ScrollContainer: React.FC<ScrollContainerProps> = memo(({ 
  children, 
  debug = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReadyRef = useRef(false);
  const pluginsLoadedRef = useRef(false);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  
  // Single initialization effect instead of multiple effects and useGSAP
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize scroll system
    const initializeScroll = async () => {
      // Load plugins if not already loaded
      if (!pluginsLoadedRef.current) {
        pluginsLoadedRef.current = await loadGsapPlugins();
        if (!pluginsLoadedRef.current) return;
      }
      
      // Enable debugging if needed
      if (debug && ScrollTrigger) {
        ScrollTrigger.defaults({ markers: debug });
      }
      
      // Use more aggressive performance settings
      if (ScrollTrigger) {
        ScrollTrigger.config({ 
          limitCallbacks: true,
          ignoreMobileResize: true,
          autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
          syncInterval: 500 // Even larger sync interval for better performance
        });
      }
      
      // Ensure ScrollTrigger starts with correct layout
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      
      if (ScrollTrigger) {
        // Use non-force refresh (false) to prevent full recalculation
        ScrollTrigger.refresh(false);
      }
      
      isReadyRef.current = true;
      
      // Apply minimum needed styling to sections
      if (containerRef.current) {
        const sections = containerRef.current.querySelectorAll('.cinematic-section');
        sections.forEach(section => {
          (section as HTMLElement).style.position = "relative";
          (section as HTMLElement).style.zIndex = "1";
          (section as HTMLElement).style.overflow = "hidden";
        });
      }
      
      // Setup anchor handling - use event delegation instead of individual handlers
      const handleAnchorClick = (e: Event) => {
        // Only process anchor tags with hash links
        const target = e.target as HTMLElement;
        const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement;
        if (!anchor) return;
        
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        
        if (!targetId || targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;
        
        // Simplified animation with fewer properties
        gsap.to(window, {
          duration: 0.5, // Even shorter duration
          scrollTo: {
            y: targetElement,
            offsetY: 0,
            autoKill: true
          },
          ease: "power1.out", // Simplest ease function
          overwrite: true, // Prevent animation stacking
          onComplete: () => {
            // Only update history if really needed
            if (window.location.hash !== targetId) {
              history.pushState(null, '', targetId);
            }
          }
        });
      };
      
      // Single event listener using delegation - major memory reduction
      document.addEventListener('click', handleAnchorClick);
      
      // Store cleanup function
      cleanupFunctionsRef.current.push(() => {
        document.removeEventListener('click', handleAnchorClick);
      });
    };
    
    // Start initialization
    initializeScroll();
    
    // Comprehensive cleanup
    return () => {
      // Execute all stored cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
      
      // Kill ScrollTrigger instances
      if (ScrollTrigger) {
        const triggers = ScrollTrigger.getAll();
        triggers.forEach((st: any) => st.kill());
      }
      
      isReadyRef.current = false;
    };
  }, [debug]);
  
  return (
    <div 
      ref={containerRef} 
      className="cinematic-scroll-container w-full overflow-x-hidden relative"
      style={{ 
        perspective: "1000px",
        perspectiveOrigin: "center center"
      }}
    >
      {children}
      
      {/* Lightweight debug info with minimal DOM nodes */}
      {debug && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 z-50 text-xs rounded">
          Scroll: {typeof window !== 'undefined' ? Math.round(window.scrollY) : 0}px
          {ScrollTrigger && <div>Triggers: {ScrollTrigger.getAll().length}</div>}
        </div>
      )}
    </div>
  );
});