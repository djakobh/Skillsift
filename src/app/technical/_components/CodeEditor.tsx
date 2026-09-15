"use client";

import Editor from "@monaco-editor/react";

export type SupportedLanguage = "python";

interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  onChange: (value: string) => void;
  onLanguageChange: (language: SupportedLanguage) => void;
  height?: string;
}

const LANGUAGE_CONFIG: Record<
  SupportedLanguage,
  { monacoId: string; label: string }
> = {
  python: { monacoId: "python", label: "Python" },
};

const STARTER_CODE: Record<SupportedLanguage, string> = {
  python: `def solution():
    # Write your code here
    pass
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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-t bg-gray-800 px-3 py-2">
        <select
          value={language}
          onChange={(e) =>
            onLanguageChange(e.target.value as SupportedLanguage)
          }
          className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {LANGUAGE_CONFIG[language].label}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded-b border border-t-0 border-gray-700">
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
