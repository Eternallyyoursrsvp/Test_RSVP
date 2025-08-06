import React, { useRef, useEffect } from 'react';

interface FloatingShapesProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
  opacity?: number;
}

// Shape definitions - stored outside component to avoid recreating on each render
const shapeDefinitions = [
  // Circle
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
  },
  // Square
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.fillRect(0, 0, size, size);
  },
  // Triangle
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.moveTo(size/2, 0);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();
  },
  // Plus
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.fillRect(size * 0.35, 0, size * 0.3, size);
    ctx.fillRect(0, size * 0.35, size, size * 0.3);
  },
  // Hexagon
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.moveTo(size/2, 0);
    ctx.lineTo(size, size/4);
    ctx.lineTo(size, size*3/4);
    ctx.lineTo(size/2, size);
    ctx.lineTo(0, size*3/4);
    ctx.lineTo(0, size/4);
    ctx.closePath();
    ctx.fill();
  },
  // Ring
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - size/10, 0, Math.PI * 2);
    ctx.lineWidth = size/5;
    ctx.stroke();
  }
];

// Convert hexadecimal color to RGBA
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const FloatingShapes: React.FC<FloatingShapesProps> = ({
  count = 5, // Even fewer elements for better performance
  color = '#ffffff',
  size = 20,
  speed = 30, 
  opacity = 0.15
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Create and manage canvas-based animations instead of DOM elements
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to fill container
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Generate shape properties once
    const shapes = Array.from({ length: count }).map((_, i) => {
      return {
        type: i % shapeDefinitions.length,
        x: canvas.width * (0.1 + (i * 0.15) % 0.8),
        y: canvas.height * (0.1 + (i * 0.2) % 0.8),
        size: size * (0.8 + Math.random() * 0.4),
        xSpeed: 0.2 + Math.random() * 0.3,
        ySpeed: 0.2 + Math.random() * 0.3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        baseOpacity: opacity * (0.5 + Math.random() * 0.5),
        opacityPhase: Math.random() * Math.PI * 2,
        opacitySpeed: 0.001 + Math.random() * 0.002
      };
    });
    
    let animationFrameId: number;
    let lastTime = 0;
    const targetFps = 20; // Lower fps for better performance
    const frameInterval = 1000 / targetFps;
    
    // Animation loop with frame limiting
    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);
      
      const delta = time - lastTime;
      if (delta < frameInterval) return;
      
      lastTime = time - (delta % frameInterval);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw shapes
      shapes.forEach(shape => {
        // Update position with gentle movements
        shape.x += Math.sin(time * 0.0001 * shape.xSpeed) * 0.5;
        shape.y += Math.cos(time * 0.0001 * shape.ySpeed) * 0.5;
        
        // Contain within bounds with buffer
        const buffer = shape.size;
        if (shape.x < -buffer) shape.x = canvas.width + buffer;
        if (shape.x > canvas.width + buffer) shape.x = -buffer;
        if (shape.y < -buffer) shape.y = canvas.height + buffer;
        if (shape.y > canvas.height + buffer) shape.y = -buffer;
        
        // Update rotation
        shape.rotation += shape.rotationSpeed;
        
        // Calculate dynamic opacity
        const currentOpacity = shape.baseOpacity * 
          (0.5 + 0.5 * Math.sin(time * 0.001 * shape.opacitySpeed + shape.opacityPhase));
        
        // Save context state
        ctx.save();
        
        // Position and rotate
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation * Math.PI / 180);
        
        // Set style properties
        ctx.fillStyle = hexToRgba(color, currentOpacity);
        ctx.strokeStyle = hexToRgba(color, currentOpacity);
        
        // Draw the shape centered at origin
        ctx.translate(-shape.size/2, -shape.size/2);
        shapeDefinitions[shape.type](ctx, shape.size);
        
        // Restore context state
        ctx.restore();
      });
    };
    
    // Start animation
    animationFrameId = requestAnimationFrame(render);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, color, size, opacity]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
};