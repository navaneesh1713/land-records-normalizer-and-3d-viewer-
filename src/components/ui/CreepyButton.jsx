import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export function CreepyButton({
  children,
  className = "",
  coverClassName = "",
  onClick,
  ...props
}) {
  const eyesRef = useRef(null);
  const [eyeCoords, setEyeCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const updateEyes = (e) => {
    const userEvent =
      "touches" in e ? e.touches[0] : e;

    if (!eyesRef.current) return;

    // get the center of the eyes container
    const eyesRect = eyesRef.current.getBoundingClientRect();
    const eyesCenter = {
      x: eyesRect.left + eyesRect.width / 2,
      y: eyesRect.top + eyesRect.height / 2,
    };

    // cursor position
    const cursor = {
      x: userEvent.clientX,
      y: userEvent.clientY,
    };

    // calculate the eye angle
    const dx = cursor.x - eyesCenter.x;
    const dy = cursor.y - eyesCenter.y;
    const angle = Math.atan2(-dy, dx) + Math.PI / 2;

    // pupil distance from the eye center
    const visionRangeX = 180; // Max distance to look horizontally
    const visionRangeY = 75; // Max distance to look vertically
    const distance = Math.hypot(dx, dy);

    // Limit the movement so pupils don't go too far
    const x = (Math.sin(angle) * Math.min(distance, visionRangeX)) / visionRangeX;
    const y = (Math.cos(angle) * Math.min(distance, visionRangeY)) / visionRangeY;

    setEyeCoords({ x, y });
  };

  // Reset eyes when mouse leaves
  const resetEyes = () => {
    setEyeCoords({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const pupilStyle = {
    transform: `translate(calc(-50% + ${eyeCoords.x * 50}%), calc(-50% + ${eyeCoords.y * 50}%))`,
  };

  return (
    <button
      className={`creepy-btn-root ${className}`}
      onClick={onClick}
      onMouseMove={(e) => {
        updateEyes(e);
        setIsHovered(true);
      }}
      onTouchMove={updateEyes}
      onMouseLeave={resetEyes}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      {...props}
    >
      {/* Eyes Container */}
      <span
        ref={eyesRef}
        className="creepy-eyes-container"
      >
        {/* Left Eye */}
        <motion.span
          className="creepy-eye"
          animate={{ height: ["0.75em", "0.75em", "0em", "0.75em"] }}
          transition={{
            duration: 3,
            times: [0, 0.92, 0.96, 1],
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span
            className="creepy-pupil"
            style={pupilStyle}
          />
        </motion.span>
        {/* Right Eye */}
        <motion.span
          className="creepy-eye"
          animate={{ height: ["0.75em", "0.75em", "0em", "0.75em"] }}
          transition={{
            duration: 3,
            times: [0, 0.92, 0.96, 1],
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span
            className="creepy-pupil"
            style={pupilStyle}
          />
        </motion.span>
      </span>

      {/* Button Cover */}
      <motion.span
        className={`creepy-btn-cover ${coverClassName}`}
        animate={{
          rotate: isHovered ? -12 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 0.8,
        }}
      >
        {children}
      </motion.span>

      {/* Invisible placeholder to maintain size since cover is absolute */}
      <span className="creepy-btn-placeholder">
        {children}
      </span>
    </button>
  );
}

export default CreepyButton;
