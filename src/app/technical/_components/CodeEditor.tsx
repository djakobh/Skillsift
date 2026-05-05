"use client";

import Editor from "@monaco-editor/react";

export type SupportedLanguage = "python" | "cpp";

interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  onChange: (value: string) => void;
  onLanguageChange: (language: SupportedLanguage) => void;
  height?: string;
}

const LANGUAGE_CONFIG: Record<SupportedLanguage, { monacoId: string; label: string }> = {
  python: { monacoId: "python", label: "Python" },
  cpp: { monacoId: "cpp", label: "C++" },
};

const STARTER_CODE: Record<SupportedLanguage, string> = {
  python: `def solution():
    # Write your code here
    pass
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here

    return 0;
}
`,
};

export function getStarterCode(language: SupportedLanguage): string {
  return STARTER_CODE[language];
}

export default function CodeEditor({
  language,
  value,
  onChange,
  onLanguageChange,
  height = "400px",
}: CodeEditorProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-t">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
          className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:outline-none focus:border-orange-500"
        >
          {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <span className="text-gray-400 text-xs">
          {LANGUAGE_CONFIG[language].label}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 border border-gray-700 border-t-0 rounded-b overflow-hidden">
        <Editor
          height={height}
          language={LANGUAGE_CONFIG[language].monacoId}
          value={value}
          onChange={(val) => onChange(val ?? "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            lineNumbers: "on",
            folding: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
}
