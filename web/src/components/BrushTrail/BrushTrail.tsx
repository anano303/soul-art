"use client";

import { useEffect, useRef, useState } from "react";
import "./BrushTrail.css";

type BrushPoint = {
  x: number;
  y: number;
  time: number;
  hue: number;
  width: number;
};

interface BrushTrailProps {
  containerRef?: React.RefObject<HTMLElement | null>;
}

const BrushTrail: React.FC<BrushTrailProps> = ({ containerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<BrushPoint[]>([]);
  const currentHue = useRef(220);
  const lastMouse = useRef<{ x: number; y: number; time: number } | null>(null);
  const [hasMouseDevice, setHasMouseDevice] = useState(false);

  useEffect(() => {
    // Detect if device has mouse capabilities
    const detectMouseDevice = () => {
      // Check if device has fine pointer capability (mouse/trackpad)
      const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
      
      // For tablets/hybrids, also check if touch is the primary input
      const primaryTouchDevice = window.matchMedia("(pointer: coarse)").matches && 
                                 "ontouchstart" in window;
      
      // Show brush trail only if device has fine pointer and is not primarily touch-based
      return hasFinePointer && !primaryTouchDevice;
    };

    const mouseCapable = detectMouseDevice();
    setHasMouseDevice(mouseCapable);

    // Listen for pointer capability changes (hybrid devices)
    const handlePointerChange = () => {
      const newMouseCapable = detectMouseDevice();
      setHasMouseDevice(newMouseCapable);
    };

    const finePointerQuery = window.matchMedia("(pointer: fine)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    
    finePointerQuery.addEventListener("change", handlePointerChange);
    coarsePointerQuery.addEventListener("change", handlePointerChange);

    // If no mouse device, don't initialize the canvas
    if (!mouseCapable) {
      return () => {
        finePointerQuery.removeEventListener("change", handlePointerChange);
        coarsePointerQuery.removeEventListener("change", handlePointerChange);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      const oldCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(oldCanvas, 0, 0);
    };
    window.addEventListener("resize", handleResize);

    // Create a background canvas for paint accumulation
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const bgCtx = bgCanvas.getContext("2d", { alpha: true });
    if (!bgCtx) return;

    const draw = () => {
      const now = Date.now();

      // Clear the main canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fade the background canvas by using a clear rectangle with low opacity
      // instead of filling with black which causes darkening
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

      // Draw fresh strokes on the main canvas
      if (points.current.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < points.current.length; i++) {
          const point = points.current[i];
          const prevPoint = points.current[i - 1];
          const age = (now - point.time) / 1000;

          if (age > 0.5) continue;

          // Create natural brush stroke
          const width = point.width * (1 - age * 2);
          const opacity = 1 - age * 2;

          // Main stroke
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.strokeStyle = `hsla(${point.hue}, 100%, 50%, ${opacity * 0.5})`;
          ctx.lineWidth = width;
          ctx.stroke();

          // Paint texture - slightly offset strokes with varying opacity
          for (let j = 0; j < 3; j++) {
            const offset = (Math.random() - 0.5) * width * 0.5;
            ctx.beginPath();
            ctx.moveTo(prevPoint.x + offset, prevPoint.y + offset);
            ctx.lineTo(point.x + offset, point.y + offset);
            ctx.strokeStyle = `hsla(${point.hue}, 100%, ${50 + j * 10}%, ${
              opacity * 0.3
            })`;
            ctx.lineWidth = width * (0.5 + Math.random() * 0.5);
            ctx.stroke();
          }

          // Paint blob at junction points
          if (i % 4 === 0) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, width * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${point.hue}, 100%, 60%, ${opacity * 0.4})`;
            ctx.fill();
          }
        }
      }

      // Transfer current strokes to background canvas for persistence
      bgCtx.globalAlpha = 0.9;
      bgCtx.drawImage(canvas, 0, 0);

      // Draw accumulated background to main canvas
      ctx.globalAlpha = 1;
      ctx.drawImage(bgCanvas, 0, 0);

      // Remove old points
      points.current = points.current.filter((p) => now - p.time < 500);

      requestAnimationFrame(draw);
    };

    const vanGoghHues = [220, 330, 180]; // Yellow and blue

    const handleMouseMove = (e: MouseEvent) => {
      // Only track mouse movement if within the container
      if (containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Check if mouse is within the container bounds
        if (
          mouseX < containerRect.left || 
          mouseX > containerRect.right || 
          mouseY < containerRect.top || 
          mouseY > containerRect.bottom
        ) {
          return; // Don't draw if outside container
        }
      }

      const now = Date.now();
      const rect = canvas.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate speed for dynamic brush properties
      const last = lastMouse.current;
      const speed = last
        ? Math.sqrt(Math.pow(x - last.x, 2) + Math.pow(y - last.y, 2)) /
          Math.max(now - last.time, 1)
        : 0;

      // Adjust brush width based on speed
      const brushWidth = 10 + Math.min(speed * 50, 20);

      // Choose hue
      if (Math.random() > 0.98 || points.current.length === 0) {
        currentHue.current =
          vanGoghHues[Math.floor(Math.random() * vanGoghHues.length)];
      }

      // Create new point
      const newPoint = {
        x,
        y,
        time: now,
        hue: currentHue.current,
        width: brushWidth,
      };

      // Interpolate points for smooth strokes
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / 5);

        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          points.current.push({
            x: last.x + dx * t,
            y: last.y + dy * t,
            time: now,
            hue: currentHue.current,
            width: brushWidth * (0.8 + Math.random() * 0.4),
          });
        }
      }

      points.current.push(newPoint);
      lastMouse.current = { x, y, time: now };
    };

    window.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      finePointerQuery.removeEventListener("change", handlePointerChange);
      coarsePointerQuery.removeEventListener("change", handlePointerChange);
    };
  }, [containerRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="brush-canvas" 
      style={{ display: hasMouseDevice ? 'block' : 'none' }}
    />
  );
};

export default BrushTrail;
