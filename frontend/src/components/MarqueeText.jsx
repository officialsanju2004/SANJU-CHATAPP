import { useEffect, useRef, useState } from 'react';

// Drop-in replacement for a truncated <p>. If the text fits, it just sits
// there like normal text. If it overflows the available width (e.g. a long
// "Last seen 2 hours ago" line in a narrow chat header), it slides right
// to left so the full line becomes readable, pauses briefly at each end,
// then repeats.
export default function MarqueeText({ text, className = '' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const measure = () => {
      const overflow = textEl.scrollWidth - container.clientWidth;
      setDistance(overflow > 2 ? overflow : 0);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [text]);

  const shouldSlide = distance > 0;
  // Longer text needs a bit more time to cross the same distance so the
  // motion speed feels consistent rather than a longer line whizzing by.
  const duration = shouldSlide ? Math.max(distance / 25, 3) + 2 : 0;

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
      <span
        ref={textRef}
        className="inline-block"
        style={
          shouldSlide
            ? {
                animationName: 'marquee-slide',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                '--marquee-distance': `-${distance}px`,
              }
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}
