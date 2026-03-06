"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface GCSImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export const GCSImage = ({ src, alt, fill, className, width, height }: GCSImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src.includes('storage.googleapis.com')) {
      // Get signed URL for GCS images
      fetch(`/api/image-signed-url?url=${encodeURIComponent(src)}`)
        .then(res => res.json())
        .then(data => {
          setSignedUrl(data.signedUrl);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to get signed URL:', err);
          setError(true);
          setLoading(false);
        });
    } else {
      // Regular image, use directly
      setSignedUrl(src);
      setLoading(false);
    }
  }, [src]);

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${className}`}>
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500">Image unavailable</span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={signedUrl}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={className}
      />
    );
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
};
