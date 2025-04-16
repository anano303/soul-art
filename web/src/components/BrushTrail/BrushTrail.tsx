"use client";

import { useEffect, useRef } from "react";
import "./BrushTrail.css";

type BrushPoint = {
  x: number;
  y: number;
  time: number;
  hue: number;
  offsets: number[];
};

const BrushTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<BrushPoint[]>([]);

  const currentHue = useRef(220);
  const targetHue = useRef(220);

  const lastMouse = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      // რბილი ფერის გადასვლა
      const diff = (targetHue.current - currentHue.current + 360) % 360;
      if (diff > 1) {
        currentHue.current = (currentHue.current + 0.5) % 360;
      }

      for (let i = 1; i < points.current.length; i++) {
        const prev = points.current[i - 1];
        const curr = points.current[i];
        const age = (now - curr.time) / 1000;
        if (age > 2) continue;

        const alpha = Math.max(1 - age / 2, 0);

        for (let j = 0; j < curr.offsets.length; j++) {
          const offsetY = curr.offsets[j];
          ctx.strokeStyle = `hsla(${curr.hue}, 80%, 60%, ${alpha * 0.2})`;
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y + offsetY);
          ctx.lineTo(curr.x, curr.y + offsetY);
          ctx.stroke();
        }
      }

      points.current = points.current.filter((p) => now - p.time < 2000);
      requestAnimationFrame(draw);
    };

    const vanGoghHues = [48, 220]; // მხოლოდ ყვითელი და ლურჯი

    const handleMouseMove = (e: MouseEvent) => {
      const brushWidth = 24;
      const lineCount = 25;
      const now = Date.now();

      const newPoint = {
        x: e.clientX,
        y: e.clientY,
        time: now,
        hue: currentHue.current,
        offsets: Array.from({ length: lineCount }, () => (Math.random() - 0.5) * brushWidth),
      };

      // Interpolate — დამატებითი წერტილები სიჩქარის დასაბალანსებლად
      const last = lastMouse.current;
      if (last) {
        const dx = newPoint.x - last.x;
        const dy = newPoint.y - last.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / 3); // ყოველი 10px-ზე ერთი შუალედური წერტილი

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          points.current.push({
            x: last.x + dx * t,
            y: last.y + dy * t,
            time: now,
            hue: currentHue.current,
            offsets: Array.from({ length: lineCount }, () => (Math.random() - 0.5) * brushWidth),
          });
        }
      }

      points.current.push(newPoint);
      lastMouse.current = { x: e.clientX, y: e.clientY, time: now };

      // აირჩიე ახალი ფერი რბილი გადასასვლელად
      targetHue.current = vanGoghHues[Math.floor(Math.random() * vanGoghHues.length)];
    };

    window.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="brush-canvas" />;
};

export default BrushTrail;
