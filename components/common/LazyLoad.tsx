"use client";

import { Suspense, ReactNode, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  height?: string;
  className?: string;
}

export default function LazyLoad({ 
  children, 
  fallback,
  height = "h-32",
  className = ""
}: LazyLoadProps) {
  const defaultFallback = (
    <Card className={className}>
      <CardContent className={`flex items-center justify-center ${height}`}>
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

// Higher-order component for lazy loading
export function withLazyLoad<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  return function LazyLoadedComponent(props: T) {
    return (
      <LazyLoad fallback={fallback}>
        <Component {...props} />
      </LazyLoad>
    );
  };
}

// Hook for lazy loading with intersection observer
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, threshold]);

  return { ref: setRef, isVisible };
}
