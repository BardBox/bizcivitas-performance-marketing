"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorPaneProps {
  value: string;
  onChange: (val: string) => void;
  language?: "html" | "css" | "javascript";
  height?: string;
}

export default function CodeEditorPane({
  value,
  onChange,
  language = "html",
  height = "calc(100vh - 260px)",
}: CodeEditorPaneProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
