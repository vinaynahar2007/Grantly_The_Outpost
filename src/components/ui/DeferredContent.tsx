import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

interface DeferredContentProps {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
}

export function DeferredContent({
  children,
  fallback,
  className,
}: DeferredContentProps) {
  const container = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (isNearViewport || !container.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [isNearViewport]);

  return (
    <div ref={container} className={className}>
      {isNearViewport ? (
        <Suspense fallback={fallback}>{children}</Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
