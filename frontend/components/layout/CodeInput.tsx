"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Code2, Loader2 } from "lucide-react";
import { GitHubIcon } from "@/components/icons/GithubIcon";
import { API_URL } from "@/lib/api";

type TabType = "paste" | "github" | "file";

export function CodeInput({ onOutput }: { onOutput: (data: any) => void }) {
  const [activeTab, setActiveTab] = useState<TabType>("paste");
  const [githubUrl, setGithubUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_URL}/fix/stream`; 
      let body: any;
      let headers: any = {};

      if (activeTab === "file") {
        body = new FormData();
        if (file) body.append("file", file);
        body.append("type", "file");
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          type: activeTab,
          content: activeTab === "github" ? githubUrl : code,
        });
      }

      const response = await fetch(url, { method: "POST", headers, body });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE-style chunks: "data: {...}\n\n"
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete chunk

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload);
            // 🔥 Stream each event to the parent
            onOutput(event);
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing the code.");
    } finally {
      setIsLoading(false);
    }
  };

  const TABS = [
    { id: "paste", label: "Paste Code", icon: Code2 },
    { id: "github", label: "GitHub URL", icon: GitHubIcon },
    { id: "file", label: "Upload File", icon: Upload },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto border-4 border-black dark:border-white shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#fff] bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b-4 border-black dark:border-white">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-black uppercase tracking-wider text-sm transition-all ${
                isActive
                  ? "bg-[var(--brand)] text-black border-r-4 border-black dark:border-white"
                  : "bg-transparent text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-6 min-h-[300px] flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === "paste" && (
            <motion.div
              key="paste"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Paste your code here..."
                className="flex-1 w-full p-4 border-4 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono text-sm resize-none focus:outline-none focus:ring-4 focus:ring-[var(--brand)]"
              />
            </motion.div>
          )}

          {activeTab === "github" && (
            <motion.div
              key="github"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-center"
            >
              <label className="text-sm font-black uppercase tracking-wider mb-2">
                GitHub File URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/blob/main/src/app.py"
                className="w-full p-4 border-4 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-[var(--brand)]"
              />
            </motion.div>
          )}

          {activeTab === "file" && (
            <motion.div
              key="file"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-center items-center border-4 border-dashed border-black dark:border-white p-10 bg-zinc-50 dark:bg-zinc-900"
            >
              <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="font-black uppercase tracking-wider mb-4">
                Drop a source file here
              </p>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:border-4 file:border-black file:bg-[var(--brand)] file:text-black file:font-black file:uppercase file:text-xs hover:file:opacity-90"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 border-4 border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-black uppercase tracking-wider text-sm">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--brand)] text-black font-black uppercase tracking-wider border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Code"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
