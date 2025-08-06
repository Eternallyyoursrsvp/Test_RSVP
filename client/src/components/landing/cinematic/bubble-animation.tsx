import React, { useRef, useEffect, memo } from 'react';

interface BubbleAnimationProps {
  count?: number;
  color?: string;
  maxSize?: number;
  minSize?: number;
  speed?: number;
  opacity?: number;
}

// Bubble animation using highly optimized canvas rendering
// Inspired by rpj.bembi.dev but completely rewritten for maximum memory efficiency
export const BubbleAnimation = memo(function BubbleAnimation({
  count = 15,           // Reduced number of elements for better performance
  color = '#ffffff',    // Default color
  maxSize = 60,         // Maximum bubble size
  minSize = 5,          // Minimum bubble size
  speed = 1,            // Animation speed factor
  opacity = 0.3         // Default opacity
}: BubbleAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number | null>(null);
  const bubbleDataRef = useRef<Float32Array | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Use a single useEffect for all initialization and cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Resize handler with debouncing
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (canvas) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          
          // Reinitialize bubble positions on resize
          initBubbles();
        }
      }, 200);
    };

    // Create a typed array for better memory efficiency - 7 values per bubble
    // [x, y, size, speedX, speedY, opacity, directionChange]
    const initBubbles = () => {
      // Use Float32Array for memory efficiency
      const bubbleData = new Float32Array(count * 7);
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      for (let i = 0; i < count; i++) {
        const idx = i * 7;
        // Position (x, y)
        bubbleData[idx] = Math.random() * canvasWidth;
        bubbleData[idx + 1] = Math.random() * canvasHeight;
        
        // Size (a value between minSize and maxSize)
        bubbleData[idx + 2] = Math.random() * (maxSize - minSize) + minSize;
        
        // Speed (x, y) - slow gentle movement
        bubbleData[idx + 3] = (Math.random() - 0.5) * speed;
        bubbleData[idx + 4] = (Math.random() - 0.5) * speed;
        
        // Individual opacity variation for visual interest
        bubbleData[idx + 5] = (Math.random() * 0.5 + 0.5) * opacity; 
        
        // Direction change timer for natural movement
        bubbleData[idx + 6] = Math.random() * 200;
      }
      
      bubbleDataRef.current = bubbleData;
    };

    // Set up canvas and initial sizes
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Initialize bubble data
    initBubbles();
    
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
    
    // Optimized animation function
    let lastFrameTime = 0;
    const targetFps = 30; // Limit to 30fps for performance
    const frameInterval = 1000 / targetFps;
    
    const animate = (currentTime: number) => {
      // Only process animation at the target frame rate
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime >= frameInterval) {
        lastFrameTime = currentTime - (deltaTime % frameInterval);
        
        if (!canvas || !ctx || !bubbleDataRef.current) return;
      
        // Clear canvas - use clearRect instead of fillRect for better performance
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const data = bubbleDataRef.current;
        const width = canvas.width;
        const height = canvas.height;
        
        // Apply mouse position influence if available
        const mouseState = (window as any).__particleMouseState;
        const mouseActive = mouseState?.active;
        const mouseX = mouseState?.x || width / 2;
        const mouseY = mouseState?.y || height / 2;
        
        // Update and draw bubbles
        for (let i = 0; i < count; i++) {
          const idx = i * 7;
          
          // Update direction change counter
          data[idx + 6] -= 1;
          
          // Occasionally change direction for more natural movement
          if (data[idx + 6] <= 0) {
            data[idx + 3] += (Math.random() - 0.5) * 0.1;
            data[idx + 4] += (Math.random() - 0.5) * 0.1;
            
            // Limit speed
            data[idx + 3] = Math.max(-0.8, Math.min(0.8, data[idx + 3]));
            data[idx + 4] = Math.max(-0.8, Math.min(0.8, data[idx + 4]));
            
            // Reset counter
            data[idx + 6] = 100 + Math.random() * 100;
          }
          
          // Apply mouse influence
          if (mouseActive) {
            const dx = mouseX - data[idx];
            const dy = mouseY - data[idx + 1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Bubbles are both attracted and repelled based on size and distance
            if (dist < 150) {
              const force = 0.2 * (1 - dist / 150);
              data[idx + 3] += dx > 0 ? force : -force;
              data[idx + 4] += dy > 0 ? force : -force;
            }
          }
          
          // Update positions
          data[idx] += data[idx + 3];
          data[idx + 1] += data[idx + 4];
          
          // Contain within canvas with bounce effect
          if (data[idx] < 0 || data[idx] > width) {
            data[idx + 3] *= -0.7; // Bounce with damping
            data[idx] = data[idx] < 0 ? 0 : width;
          }
          
          if (data[idx + 1] < 0 || data[idx + 1] > height) {
            data[idx + 4] *= -0.7; // Bounce with damping
            data[idx + 1] = data[idx + 1] < 0 ? 0 : height;
          }
          
          // Draw bubble
          const size = data[idx + 2];
          const bubbleOpacity = data[idx + 5];
          
          // Create gradient for realistic bubble effect
          const gradient = ctx.createRadialGradient(
            data[idx], data[idx + 1], 0,
            data[idx], data[idx + 1], size
          );
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${bubbleOpacity * 0.5})`);
          gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${bubbleOpacity * 0.3})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          
          ctx.beginPath();
          ctx.arc(data[idx], data[idx + 1], size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add highlight for realistic bubble appearance (only on larger bubbles)
          if (size > 15) {
            ctx.beginPath();
            ctx.arc(data[idx] - size * 0.2, data[idx + 1] - size * 0.3, size * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${bubbleOpacity * 0.6})`;
            ctx.fill();
          }
        }
      }
      
      // Request next frame
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more reliable size tracking
    if ('ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(canvas);
    }
    
    // Start animation
    requestIdRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
        requestIdRef.current = null;
      }
      
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      // Clear typed array reference
      bubbleDataRef.current = null;
    };
  }, [count, color, maxSize, minSize, speed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    />
  );
});

export default BubbleAnimation;