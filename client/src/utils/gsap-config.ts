/**
 * Centralized GSAP configuration to ensure plugins are properly registered
 * before any components try to use them.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Register all GSAP plugins here
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Configure ScrollTrigger defaults
ScrollTrigger.config({
  ignoreMobileResize: true,
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize"
});

// Helper for creating scroll-triggered animations
export const createScrollTrigger = (
  trigger: string | Element,
  animation: gsap.core.Timeline | gsap.core.Tween,
  options: Partial<ScrollTrigger.Vars> = {}
) => {
  try {
    return ScrollTrigger.create({
      trigger,
      animation,
      start: options.start || "top bottom",
      end: options.end || "bottom top",
      scrub: options.scrub ?? true,
      markers: options.markers ?? false,
      toggleActions: options.toggleActions || "play none none reverse",
      ...options
    });
  } catch (error) {
    // Silent failure in production
    return null;
  }
};

// Helper for creating section transitions
export const createSectionTransition = (
  section: Element,
  elements: Element | Element[],
  fromVars: gsap.TweenVars,
  toVars: gsap.TweenVars,
  options: Partial<ScrollTrigger.Vars> = {}
) => {
  try {
    gsap.set(elements, fromVars);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: options.start || "top bottom",
        end: options.end || "top center",
        scrub: options.scrub ?? 0.5,
        markers: options.markers ?? false,
        ...options
      }
    });
    
    tl.to(elements, { ...toVars, stagger: 0.05 });
    
    return tl;
  } catch (error) {
    // Silent failure in production
    return null;
  }
};

// Export configured gsap instance
export { gsap, ScrollTrigger, ScrollToPlugin };