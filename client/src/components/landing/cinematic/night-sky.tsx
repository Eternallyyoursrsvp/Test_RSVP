import React, { useRef, useEffect, memo } from 'react';

interface NightSkyProps {
  starCount?: number;
  shootingStarCount?: number;
  color?: string;
  moonGlow?: boolean;
}

// Highly optimized night sky animation using canvas rendering
export const NightSky = memo(function NightSky({
  starCount = 200,           // Number of stars
  shootingStarCount = 3,     // Number of shooting stars
  color = '#ffffff',         // Star color
  moonGlow = true            // Whether to show moon glow effect
}: NightSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  
  // Memory-efficient storage using typed arrays
  // Each star: x, y, size, brightness, twinkleSpeed, twinkleOffset
  const starsRef = useRef<Float32Array | null>(null);
  // Each shooting star: x, y, targetX, targetY, progress, speed, length, active
  const shootingStarsRef = useRef<Float32Array | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Handle resize efficiently using passive event listener
    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        // Re-initialize stars on resize to maintain distribution
        initializeStars();
      }
    };
    
    // Throttled resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const throttledResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 200);
    };
    
    // Initialize canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Parse color once to avoid repeated parsing
    let r = 255, g = 255, b = 255;
    if (color.startsWith('#')) {
      if (color.length === 7) {
        r = parseInt(color.substr(1, 2), 16);
        g = parseInt(color.substr(3, 2), 16);
        b = parseInt(color.substr(5, 2), 16);
      } else if (color.length === 4) {
        r = parseInt(color.charAt(1) + color.charAt(1), 16);
        g = parseInt(color.charAt(2) + color.charAt(2), 16);
        b = parseInt(color.charAt(3) + color.charAt(3), 16);
      }
    }
    
    // Create moon glow effect if enabled
    const createMoonGlow = () => {
      if (!canvas || !ctx || !moonGlow) return;
      
      // Create radial gradient for moon glow
      const moonX = canvas.width * 0.8;
      const moonY = canvas.height * 0.2;
      const moonRadius = Math.min(canvas.width, canvas.height) * 0.05;
      const glowRadius = moonRadius * 10;
      
      // Draw moon with subtle glow
      const moonGradient = ctx.createRadialGradient(
        moonX, moonY, moonRadius * 0.8,
        moonX, moonY, glowRadius
      );
      
      // Soft blue-white glow
      moonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      moonGradient.addColorStop(0.05, 'rgba(200, 220, 255, 0.6)');
      moonGradient.addColorStop(0.2, 'rgba(170, 200, 255, 0.2)');
      moonGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.05)');
      moonGradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
      
      // Draw moon glow
      ctx.fillStyle = moonGradient;
      ctx.beginPath();
      ctx.arc(moonX, moonY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw moon itself
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add subtle crater details
      ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
      ctx.beginPath();
      ctx.arc(moonX - moonRadius * 0.3, moonY - moonRadius * 0.2, moonRadius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(moonX + moonRadius * 0.4, moonY + moonRadius * 0.3, moonRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    };
    
    // Initialize stars with memory-efficient typed array
    const initializeStars = () => {
      if (!canvas) return;
      
      // Allocate memory only once using typed arrays
      starsRef.current = new Float32Array(starCount * 6);
      
      // Initialize with golden ratio distribution for natural appearance
      const phi = (1 + Math.sqrt(5)) / 2;
      
      for (let i = 0; i < starCount; i++) {
        const idx = i * 6;
        
        // Distribute stars using golden ratio for natural appearance
        const theta = i * phi * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * 0.9; // Concentrate more stars in center
        
        starsRef.current[idx] = 0.5 + radius * Math.cos(theta) * 0.5; // Normalized x position (0-1)
        starsRef.current[idx + 1] = 0.5 + radius * Math.sin(theta) * 0.5; // Normalized y position (0-1)
        starsRef.current[idx + 2] = 0.5 + Math.random() * 1.5; // Size (0.5-2)
        starsRef.current[idx + 3] = 0.3 + Math.random() * 0.7; // Base brightness (0.3-1)
        starsRef.current[idx + 4] = 0.5 + Math.random() * 1.5; // Twinkle speed
        starsRef.current[idx + 5] = Math.random() * Math.PI * 2; // Twinkle phase offset
      }
      
      // Initialize shooting stars
      shootingStarsRef.current = new Float32Array(shootingStarCount * 8);
      
      // Initial shooting stars all inactive
      for (let i = 0; i < shootingStarCount; i++) {
        const idx = i * 8;
        shootingStarsRef.current[idx + 7] = 0; // Inactive
      }
    };
    
    // Create a shooting star at random intervals
    const createShootingStar = (time: number) => {
      if (!shootingStarsRef.current || !canvas) return;
      
      // Find an inactive shooting star slot
      for (let i = 0; i < shootingStarCount; i++) {
        const idx = i * 8;
        
        // Only create if inactive and random chance (creates periodic shooting stars)
        if (shootingStarsRef.current[idx + 7] === 0 && Math.random() < 0.01) {
          const startX = Math.random() * canvas.width;
          const startY = Math.random() * canvas.height * 0.3; // Start in top third
          
          // Calculate end position (diagonal downward trajectory)
          const targetX = startX + (Math.random() * 0.5 + 0.5) * canvas.width * 0.3;
          const targetY = startY + (Math.random() * 0.5 + 0.5) * canvas.height * 0.3;
          
          shootingStarsRef.current[idx] = startX; // x
          shootingStarsRef.current[idx + 1] = startY; // y
          shootingStarsRef.current[idx + 2] = targetX; // targetX
          shootingStarsRef.current[idx + 3] = targetY; // targetY
          shootingStarsRef.current[idx + 4] = 0; // progress (0-1)
          shootingStarsRef.current[idx + 5] = 0.005 + Math.random() * 0.01; // speed
          shootingStarsRef.current[idx + 6] = 20 + Math.random() * 30; // tail length
          shootingStarsRef.current[idx + 7] = 1; // active
          
          break; // Only create one at a time
        }
      }
    };
    
    // Update and draw shooting stars
    const updateShootingStars = (time: number) => {
      if (!shootingStarsRef.current || !ctx || !canvas) return;
      
      for (let i = 0; i < shootingStarCount; i++) {
        const idx = i * 8;
        
        // Skip inactive
        if (shootingStarsRef.current[idx + 7] === 0) continue;
        
        // Update progress
        shootingStarsRef.current[idx + 4] += shootingStarsRef.current[idx + 5]; // Add speed to progress
        
        // Deactivate if complete
        if (shootingStarsRef.current[idx + 4] >= 1) {
          shootingStarsRef.current[idx + 7] = 0;
          continue;
        }
        
        // Calculate current position
        const progress = shootingStarsRef.current[idx + 4];
        const startX = shootingStarsRef.current[idx];
        const startY = shootingStarsRef.current[idx + 1];
        const targetX = shootingStarsRef.current[idx + 2];
        const targetY = shootingStarsRef.current[idx + 3];
        
        const currentX = startX + (targetX - startX) * progress;
        const currentY = startY + (targetY - startY) * progress;
        
        // Draw shooting star with tail
        const tailLength = shootingStarsRef.current[idx + 6];
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const dx = Math.cos(angle) * tailLength;
        const dy = Math.sin(angle) * tailLength;
        
        // Create gradient tail
        const gradient = ctx.createLinearGradient(
          currentX, currentY,
          currentX - dx, currentY - dy
        );
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX - dx, currentY - dy);
        ctx.stroke();
        
        // Draw bright head
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    // Animation loop with frame rate limiting
    let lastFrameTime = 0;
    const targetFps = 30; // Limit to 30fps for performance
    const frameInterval = 1000 / targetFps;
    
    const render = (time: number) => {
      // Limit frame rate
      const deltaTime = time - lastFrameTime;
      
      if (deltaTime > frameInterval) {
        lastFrameTime = time - (deltaTime % frameInterval);
        
        if (!canvas || !ctx || !starsRef.current) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw moon first (if enabled)
        if (moonGlow) {
          createMoonGlow();
        }
        
        // Occasionally create shooting stars
        createShootingStar(time);
        
        // Update and draw shooting stars
        updateShootingStars(time);
        
        // Draw stars
        for (let i = 0; i < starCount; i++) {
          const idx = i * 6;
          
          // Get star properties
          const xRatio = starsRef.current[idx]; // 0-1
          const yRatio = starsRef.current[idx + 1]; // 0-1
          
          const x = xRatio * canvas.width;
          const y = yRatio * canvas.height;
          
          const baseSize = starsRef.current[idx + 2];
          const baseBrightness = starsRef.current[idx + 3];
          const twinkleSpeed = starsRef.current[idx + 4];
          const twinkleOffset = starsRef.current[idx + 5];
          
          // Calculate twinkle effect
          const twinkle = Math.sin(time * 0.001 * twinkleSpeed + twinkleOffset);
          const brightness = baseBrightness * (0.6 + twinkle * 0.4);
          
          // Size variation based on brightness
          const size = baseSize * (0.8 + brightness * 0.2);
          
          // Star style based on brightness
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`;
          
          // Draw star with glow - use different drawing methods based on size for efficiency
          if (size < 1.2) {
            // Small stars as simple circles
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Larger stars with slight cross shape for more detail
            ctx.beginPath();
            
            // Create a cross shape
            ctx.rect(x - size/2, y - size/6, size, size/3);
            ctx.rect(x - size/6, y - size/2, size/3, size);
            ctx.fill();
            
            // Add glow for larger stars
            const glow = ctx.createRadialGradient(
              x, y, 0,
              x, y, size * 3
            );
            
            glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brightness * 0.5})`);
            glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Request next frame
      rafRef.current = requestAnimationFrame(render);
    };
    
    // Initialize all stars
    initializeStars();
    
    // Set up event listeners
    window.addEventListener('resize', throttledResize, { passive: true });
    
    // Start animation
    rafRef.current = requestAnimationFrame(render);
    
    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      window.removeEventListener('resize', throttledResize);
      clearTimeout(resizeTimeout);
      
      // Clear references to typed arrays
      starsRef.current = null;
      shootingStarsRef.current = null;
    };
  }, [starCount, shootingStarCount, color, moonGlow]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    />
  );
});

export default NightSky;