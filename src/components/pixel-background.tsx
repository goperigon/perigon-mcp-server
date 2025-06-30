"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  char: string;
  size: number;
  baseOpacity: number;
  layer: number;
  twinklePhase: number;
  twinkleSpeed: number;
  popPhase: number;
  popSpeed: number;
  isCluster: boolean;
  clusterStars?: Array<{ offsetX: number; offsetY: number; char: string; phase: number }>;
}

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Tiny pixel characters for authentic Galaga feel
    const starChars = {
      layer1: [".", "·"], // Tiny background pixels
      layer2: [".", "·", "•"], // Small pixels
      layer3: ["•", "∘"], // Slightly larger but still tiny pixels
      clusters: [".", "·"], // Tiny cluster pixels
    };

    const stars: Star[] = [];

    // Get star colors from CSS custom properties using Perigon palette
    const getStarColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      
      if (isDark) {
        return {
          layer1: "rgb(214, 211, 209)", // pg-gray-300 equivalent for dark mode
          layer2: "rgb(231, 229, 228)", // pg-gray-200 equivalent for dark mode  
          layer3: "rgb(245, 245, 244)", // pg-gray-100 equivalent for dark mode
          accent: "rgb(249, 192, 53)", // pg-gold
        };
      } else {
        return {
          layer1: "rgb(120, 113, 108)", // pg-gray-500
          layer2: "rgb(87, 83, 78)", // pg-gray-600
          layer3: "rgb(41, 37, 36)", // pg-gray-800
          accent: "rgb(249, 192, 53)", // pg-gold
        };
      }
    };

    // Initialize static stars with clusters for Galaga-style pixelated feel
    const initializeStars = () => {
      stars.length = 0;
      const starCount = Math.floor((canvas.width * canvas.height) / 800); // Much more stars

      for (let i = 0; i < starCount; i++) {
        const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
        const isCluster = Math.random() < 0.25; // 25% chance for cluster - more clusters
        let chars: string[];
        let baseSize: number;
        let baseOpacity: number;

        switch (layer) {
          case 1: // Background layer - tiny pixels
            chars = starChars.layer1;
            baseSize = 2 + Math.random() * 1; // Tiny tiny pixels
            baseOpacity = 0.4 + Math.random() * 0.3;
            break;
          case 2: // Middle layer - small pixels
            chars = starChars.layer2;
            baseSize = 3 + Math.random() * 1; // Still tiny
            baseOpacity = 0.6 + Math.random() * 0.3;
            break;
          case 3: // Foreground layer - slightly larger but still tiny
            chars = starChars.layer3;
            baseSize = 4 + Math.random() * 1; // Tiny but visible
            baseOpacity = 0.8 + Math.random() * 0.2;
            break;
          default:
            chars = starChars.layer1;
            baseSize = 2;
            baseOpacity = 0.4;
        }

        const star: Star = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          char: chars[Math.floor(Math.random() * chars.length)],
          size: baseSize,
          baseOpacity,
          layer,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 1.5 + Math.random() * 2.5, // Even faster twinkling
          popPhase: Math.random() * Math.PI * 2,
          popSpeed: 0.5 + Math.random() * 1.0, // Faster pop effects
          isCluster,
        };

        // Create cluster of tiny stars around main star
        if (isCluster) {
          const clusterSize = 2 + Math.floor(Math.random() * 4); // 2-5 stars in cluster
          star.clusterStars = [];
          
          for (let j = 0; j < clusterSize; j++) {
            star.clusterStars.push({
              offsetX: (Math.random() - 0.5) * 8, // Tighter cluster radius for tiny pixels
              offsetY: (Math.random() - 0.5) * 8,
              char: starChars.clusters[Math.floor(Math.random() * starChars.clusters.length)],
              phase: Math.random() * Math.PI * 2,
            });
          }
        }

        stars.push(star);
      }
    };

    initializeStars();

    const animate = () => {
      time += 0.016; // ~60fps

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get star colors for current theme on each frame to handle theme changes
      const colors = getStarColors();

      // Draw stars by layer (back to front) - NO MOVEMENT, heavy twinkling
      for (let layer = 1; layer <= 3; layer++) {
        stars
          .filter((star) => star.layer === layer)
          .forEach((star) => {
            // Much more aggressive twinkling
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.6;
            
            // More frequent "pop" effect - stars brighten more often
            const pop = Math.sin(time * star.popSpeed + star.popPhase);
            const popEffect = pop > 0.7 ? 0.8 : 0; // Even more frequent and brighter pops
            
            const currentOpacity = Math.max(0.1, star.baseOpacity + twinkle + popEffect);

            // Choose color based on layer and occasional accent
            let starColor = layer === 1 ? colors.layer1 : layer === 2 ? colors.layer2 : colors.layer3;
            
            // More frequent gold accent for special stars
            if (Math.random() < 0.002 && layer >= 2) {
              starColor = colors.accent;
            }

            // Set font and style
            ctx.font = `${star.size}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = starColor
              .replace("rgb", "rgba")
              .replace(")", `, ${currentOpacity})`);

            // Draw the main star (static position)
            ctx.fillText(star.char, star.x, star.y);

            // Draw cluster stars if this is a cluster
            if (star.isCluster && star.clusterStars) {
              star.clusterStars.forEach((clusterStar) => {
                const clusterTwinkle = Math.sin(time * (star.twinkleSpeed * 1.5) + clusterStar.phase) * 0.7;
                const clusterOpacity = Math.max(0.1, (star.baseOpacity * 0.8) + clusterTwinkle);
                
                ctx.font = `${Math.max(1, star.size * 0.5)}px monospace`; // Even tinier cluster stars
                ctx.fillStyle = starColor
                  .replace("rgb", "rgba")
                  .replace(")", `, ${clusterOpacity})`);
                
                ctx.fillText(
                  clusterStar.char,
                  star.x + clusterStar.offsetX,
                  star.y + clusterStar.offsetY
                );
              });
            }
          });
      }

      animationId = requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      resizeCanvas();
      initializeStars(); // Reinitialize stars for new screen size
    };

    window.addEventListener("resize", handleResize);

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-70"
    />
  );
}
