"use client";

import toast from "react-hot-toast";
import { GCSUpload } from "@/components/ui/gcs-upload";

interface FileUploadProps {
  onChange: (url?: string) => void;
  endpoint: string;
};

export const FileUpload = ({
  onChange,
  endpoint
}: FileUploadProps) => {
  const getAcceptType = (endpoint: string) => {
    switch (endpoint) {
      case "chapterVideo":
        return "video/*";
      case "courseImage":
        return "image/*";
      case "courseAttachment":
        return "*/*";
      default:
        return "*/*";
    }
  };

  const getMaxSize = (endpoint: string) => {
    switch (endpoint) {
      case "chapterVideo":
        return 512000; // 512GB in MB
      case "courseImage":
        return 4; // 4MB
      case "courseAttachment":
        return 100; // 100MB
      default:
        return 100;
    }
  };

  const getUploadType = (endpoint: string): "course-image" | "chapter-video" | "attachment" => {
    switch (endpoint) {
      case "chapterVideo":
        return "chapter-video";
      case "courseImage":
        return "course-image";
      case "courseAttachment":
        return "attachment";
      default:
        return "attachment";
    }
  };

  return (
    <GCSUpload
      uploadType={getUploadType(endpoint)}
      accept={getAcceptType(endpoint)}
      maxSize={getMaxSize(endpoint)}
      onUploadComplete={(url, key) => {
        onChange(url);
      }}
    />
  )
}