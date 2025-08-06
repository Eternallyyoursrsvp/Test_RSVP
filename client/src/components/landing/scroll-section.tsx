import React, { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollSectionProps {
  id: string;
  children: ReactNode;
  background?: string;
  textColor?: string;
  parallaxSpeed?: number;
  fadeDirection?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const ScrollSection: React.FC<ScrollSectionProps> = ({
  id,
  children,
  background = 'bg-white',
  textColor = 'text-black',
  parallaxSpeed = 0.5,
  fadeDirection = 'up',
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    fadeDirection === 'up'
      ? [100, 0]
      : fadeDirection === 'down'
      ? [-100, 0]
      : [0, 0]
  );
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    fadeDirection === 'left'
      ? [100, 0]
      : fadeDirection === 'right'
      ? [-100, 0]
      : [0, 0]
  );
  
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`min-h-screen w-full ${background} ${textColor} flex items-center justify-center relative overflow-hidden`}
      data-scroll-section
    >
      <motion.div
        className="w-full h-full py-20 px-8 md:px-16 lg:px-24 2xl:px-32 flex flex-col justify-center"
        style={{
          opacity,
          y: fadeDirection === 'up' || fadeDirection === 'down' ? y : 0,
          x: fadeDirection === 'left' || fadeDirection === 'right' ? x : 0,
          scale: fadeDirection === 'none' ? scale : 1,
        }}
      >
        {children}
      </motion.div>
    </section>
  );
};