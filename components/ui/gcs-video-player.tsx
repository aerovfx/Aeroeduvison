"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface GCSVideoPlayerProps {
  videoKey?: string;
  videoUrl?: string;
  useSignedUrl?: boolean;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onEnded?: () => void;
}

export const GCSVideoPlayer = ({ 
  videoKey, 
  videoUrl: propVideoUrl,
  useSignedUrl = false, 
  className = "",
  autoPlay = false,
  controls = true,
  onEnded
}: GCSVideoPlayerProps) => {
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        setLoading(true);
        setError("");
        
               // If videoUrl is provided directly, use it
               if (propVideoUrl) {
                 setCurrentVideoUrl(propVideoUrl);
                 setLoading(false);
                 return;
               }
        
        // Otherwise, fetch from API using videoKey
        if (videoKey) {
          const response = await fetch(`/api/video/stream?key=${encodeURIComponent(videoKey)}&signed=${useSignedUrl}`);
          
          if (!response.ok) {
            throw new Error(`Failed to get video URL: ${response.statusText}`);
          }
          
          const data = await response.json();
          setCurrentVideoUrl(data.videoUrl);
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(`Failed to load video: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoUrl();
  }, [videoKey, propVideoUrl, useSignedUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading video from GCS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600">Error loading video: {error}</p>
        </div>
      </div>
    );
  }

  if (!currentVideoUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <p className="text-sm text-gray-600">No video URL available</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={currentVideoUrl}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        autoPlay={autoPlay}
        controls={controls}
        preload="metadata"
      />
      
      {!controls && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlay}
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
        </div>
      )}

      {/* Custom Controls Overlay */}
      {!controls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center gap-4">
            <Button onClick={togglePlay} variant="ghost" size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <Button onClick={toggleMute} variant="ghost" size="sm">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            
            <Button onClick={toggleFullscreen} variant="ghost" size="sm">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};