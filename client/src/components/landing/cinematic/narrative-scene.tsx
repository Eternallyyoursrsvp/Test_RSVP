import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { FloatingShapes } from './floating-shapes';

interface Layer {
  id: string;
  content: React.ReactNode;
  depth?: number;
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  opacity?: number;
  scale?: number;
}

interface NarrativeSceneProps {
  title: string;
  tagline: string;
  layers: Layer[];
  backgroundColor?: string;
  textColor?: string;
  hasShapes?: boolean;
  pinnedDuration?: number; // How long the scene stays pinned during scroll
}

/**
 * A complex cinematic scene component that creates a layered, parallax storytelling experience
 */
export const NarrativeScene: React.FC<NarrativeSceneProps> = ({
  title,
  tagline,
  layers,
  backgroundColor = '#000',
  textColor = 'white',
  hasShapes = true,
  pinnedDuration = 1
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Create unique ID for this scene
  const sceneId = title.toLowerCase().replace(/\s+/g, '-');
  
  useGSAP(() => {
    try {
      if (!sceneRef.current || !contentRef.current) return;
      
      // Use ScrollTrigger directly (already registered in scroll-container.tsx)
      // Create master timeline for the scene with protection against null refs
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sceneRef.current,
          start: "top top",
          end: `+=${pinnedDuration * 100}%`,
          pin: true,
          pinSpacing: true,
          scrub: 0.5, // smoother scrubbing for better performance
          anticipatePin: 1,
          markers: false,
          onEnter: () => {},
          onLeave: () => {},
        }
      });
      
      // Safely get references and protect against null
      const sceneElement = sceneRef.current;
      if (!sceneElement) return;
      
      // Get references safely
      const titleElement = sceneElement.querySelector('.scene-title');
      const taglineElement = sceneElement.querySelector('.scene-tagline');
      
      // Animate title with split text
      if (titleElement) {
        const words = titleElement.querySelectorAll('.word');
        if (words.length > 0) {
          // Reveal title word by word
          gsap.set(words, { 
            autoAlpha: 0, 
            y: 50,
            willChange: 'opacity, transform' // Performance hint
          });
          
          timeline.to(words, {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.3,
            ease: "power2.out"
          }, 0);
        }
      }
      
      // Animate tagline
      if (taglineElement) {
        gsap.set(taglineElement, { 
          autoAlpha: 0,
          willChange: 'opacity' // Performance hint
        });
        
        timeline.to(taglineElement, {
          autoAlpha: 1,
          duration: 0.3,
          ease: "power2.out"
        }, 0.3);
      }
      
      // Animate each layer with parallax effect based on its depth
      const layerElements = sceneElement.querySelectorAll('.scene-layer');
      
      if (layerElements.length > 0) {
        layerElements.forEach((layerEl) => {
          const depth = parseFloat(layerEl.getAttribute('data-depth') || '1');
          const position = layerEl.getAttribute('data-position') || 'center';
          
          // Create starting position based on layer position
          let xStart = 0, yStart = 0;
          switch (position) {
            case 'left': xStart = -50; break;
            case 'right': xStart = 50; break;
            case 'top': yStart = -30; break;
            case 'bottom': yStart = 30; break;
          }
          
          // Set initial position with performance hints
          gsap.set(layerEl, { 
            x: xStart, 
            y: yStart, 
            autoAlpha: 0,
            scale: 0.9,
            willChange: 'transform, opacity' // Performance hint
          });
          
          // Animate to center
          timeline.to(layerEl, {
            x: 0,
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.5,
            ease: "power2.out"
          }, 0.2 + (0.1 * depth));
          
          // Add parallax movement based on depth - simplified for better performance
          // Use translateX/Y instead of x/y for better hardware acceleration
          timeline.to(layerEl, {
            y: position === 'top' ? 30 : position === 'bottom' ? -30 : 0,
            x: position === 'left' ? 30 : position === 'right' ? -30 : 0,
            scale: 1 + (0.1 * depth),
            ease: "none",
            force3D: true // Force 3D transforms for hardware acceleration
          }, 0.5);
        });
      }
    } catch (error) {
      // Silent error in production to avoid console errors for users
      // Animations will gracefully degrade if they fail
    }
  }, { scope: sceneRef, dependencies: [sceneId, pinnedDuration] });

  // Split text into words for animation
  const renderTitle = () => {
    return title.split(' ').map((word, index) => (
      <span key={index} className="word inline-block mr-[0.25em] transform-gpu">
        {word}
      </span>
    ));
  };

  return (
    <div 
      ref={sceneRef}
      className="narrative-scene h-screen w-full relative overflow-hidden"
      style={{ backgroundColor, color: textColor }}
      id={sceneId}
    >
      {/* Background floating shapes for visual interest */}
      {hasShapes && (
        <FloatingShapes 
          count={15} 
          color={textColor} 
          opacity={0.05} 
          size={30} 
          speed={30}
        />
      )}
      
      {/* Main content container */}
      <div 
        ref={contentRef}
        className="w-full h-full flex flex-col items-center justify-center relative z-10 px-8"
      >
        {/* Title with word-by-word animation */}
        <h2 
          className="scene-title text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-center"
        >
          {renderTitle()}
        </h2>
        
        {/* Tagline */}
        <p className="scene-tagline text-xl md:text-2xl lg:text-3xl mb-16 text-center opacity-80 max-w-3xl">
          {tagline}
        </p>
        
        {/* Content layers with parallax effects */}
        <div className="scene-layers relative h-full max-h-[60vh] w-full max-w-6xl flex items-center justify-center">
          {layers.map((layer) => (
            <div 
              key={layer.id}
              className={`scene-layer absolute inset-0 flex items-center justify-center`}
              data-depth={layer.depth || 1}
              data-position={layer.position || 'center'}
              style={{ 
                opacity: layer.opacity !== undefined ? layer.opacity : 1,
                zIndex: Math.round(10 - (layer.depth || 1))
              }}
            >
              {layer.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};