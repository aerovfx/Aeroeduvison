"use client";

interface PreviewProps {
  value: string;
};

export const Preview = ({
  value,
}: PreviewProps) => {
  return (
    <div 
      className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-md border"
      dangerouslySetInnerHTML={{ 
        __html: value
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/__(.*?)__/g, '<u>$1</u>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
          .replace(/\n/g, '<br/>')
      }}
    />
  );
};
