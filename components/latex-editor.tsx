"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center border rounded-md bg-muted/30" style={{ minHeight: "400px" }}>
      <span className="text-sm text-muted-foreground">Đang tải editor...</span>
    </div>
  ),
});

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export function LatexEditor({ value, onChange, height = "70vh", readOnly }: LatexEditorProps) {
  const prevValueRef = useRef(value);

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const handleEditorChange = (newValue: string | undefined) => {
    const v = newValue ?? "";
    prevValueRef.current = v;
    onChange(v);
  };

  return (
    <div style={{ height, minHeight: "300px" }} className="w-full border rounded-md overflow-hidden">
      <MonacoEditor
        language="plaintext"
        theme="vs"
        value={value}
        onChange={handleEditorChange}
        height={height}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          readOnly: !!readOnly,
          wordWrap: "on",
          automaticLayout: true,
        }}
        loading={null}
      />
    </div>
  );
}
