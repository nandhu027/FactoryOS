import { motion } from "framer-motion";

// 🪄 PRO-LEVEL ANIMATION CONSTANTS
const cinematicEase = [0.16, 1, 0.3, 1];

const Card = ({
  children,
  className = "",
  padding = "p-6",
  animated = true,
  interactive = false,
  delay = 0,
  ...props
}) => {
  const baseClasses = `
    relative bg-white rounded-2xl border border-zinc-200/80
    shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)]
    ${interactive ? "transition-all duration-400 ease-out hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] hover:border-zinc-300 hover:-translate-y-0.5 cursor-pointer" : ""}
    ${padding}
    ${className}
  `;
  if (!animated) {
    return (
      <div className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: cinematicEase,
      }}
      className={baseClasses}
      {...props}
    >
      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,1)] pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default Card;
