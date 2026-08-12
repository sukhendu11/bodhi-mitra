import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in seconds before the reveal animation starts (for staggering). */
  delay?: number;
  /** How far the element slides up. Default 20px. */
  distance?: number;
  /** Duration of the animation in seconds. Default 0.6. */
  duration?: number;
  /** Additional class names. */
  className?: string;
  /** HTML element to render as. Default "div". */
  as?: "div" | "section" | "article" | "header" | "footer" | "aside" | "span" | "nav";
}

export function Reveal({
  children,
  delay = 0,
  distance = 20,
  duration = 0.6,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);

    // Reduced-motion users get content instantly — no entrance animation.
    if (mq.matches) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Skip the entrance animation entirely for reduced-motion users.
  const style: React.CSSProperties = prefersReduced
    ? {}
    : {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity ${duration}s ease-out, transform ${duration}s ease-out`,
        transitionDelay: `${delay}s`,
      };

  return (
    <Tag ref={ref} style={style} className={className}>
      {children}
    </Tag>
  );
}
