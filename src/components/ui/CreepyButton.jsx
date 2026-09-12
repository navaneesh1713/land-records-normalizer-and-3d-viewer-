import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export function CreepyButton({
  children,
  className = "",
  coverClassName = "",
  onClick,
  ...props
}) {
  const eyesRef = useRef(null);
  const buttonRef = useRef(null);
  const [eyeCoords, setEyeCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!eyesRef.current) return;
      const eyesRect = eyesRef.current.getBoundingClientRect();
      const eyesCenter = {
        x: eyesRect.left + eyesRect.width / 2,
        y: eyesRect.top + eyesRect.height / 2,
      };

      const dx = e.clientX - eyesCenter.x;
      const dy = e.clientY - eyesCenter.y;
      const angle = Math.atan2(-dy, dx) + Math.PI / 2;

      const visionRangeX = 250;
      const visionRangeY = 120;
      const distance = Math.hypot(dx, dy);

      const x = (Math.sin(angle) * Math.min(distance, visionRangeX)) / visionRangeX;
      const y = (Math.cos(angle) * Math.min(distance, visionRangeY)) / visionRangeY;

      setEyeCoords({ x, y });
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  const pupilTransform = `translate(calc(-50% + ${eyeCoords.x * 6}px), calc(-50% + ${eyeCoords.y * 4.5}px))`;

  return (
    <button
      ref={buttonRef}
      className={`creepy-btn-root ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      type="button"
      {...props}
    >
      {/* Eyes Container (revealed when cover rotates) */}
      <span ref={eyesRef} className="creepy-eyes-container" aria-hidden="true">
        {/* Left Eye */}
        <motion.span
          className="creepy-eye"
          animate={{ scaleY: [1, 1, 0.08, 1] }}
          transition={{
            duration: 3.6,
            times: [0, 0.9, 0.94, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span
            className="creepy-pupil"
            style={{ transform: pupilTransform }}
          />
        </motion.span>

        {/* Right Eye */}
        <motion.span
          className="creepy-eye"
          animate={{ scaleY: [1, 1, 0.08, 1] }}
          transition={{
            duration: 3.6,
            times: [0, 0.9, 0.94, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span
            className="creepy-pupil"
            style={{ transform: pupilTransform }}
          />
        </motion.span>
      </span>

      {/* Interactive Top Cover */}
      <motion.span
        className={`creepy-btn-cover ${coverClassName}`}
        animate={{
          rotate: isHovered ? -14 : 0,
          y: isHovered ? -3 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 22,
          mass: 0.7,
        }}
      >
        {children}
      </motion.span>

      {/* Invisible placeholder to define button footprint */}
      <span className="creepy-btn-placeholder" aria-hidden="true">
        {children}
      </span>
    </button>
  );
}

export default CreepyButton;
