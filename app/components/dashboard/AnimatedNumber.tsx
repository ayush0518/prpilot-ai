import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  className?: string;
};

export default function AnimatedNumber({
  value,
  duration = 0.8,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const controls = animate(previousValueRef.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    previousValueRef.current = value;

    return () => {
      controls.stop();
    };
  }, [duration, value]);

  return <span className={className}>{displayValue}</span>;
}
