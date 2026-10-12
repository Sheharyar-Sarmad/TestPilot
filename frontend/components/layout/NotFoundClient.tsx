// frontend/components/shared/NotFoundClient.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Terminal, AlertTriangle } from "lucide-react";

export default function NotFoundClient() {
  return (
    // Added py-12 to the wrapper to give it breathing room, but no longer forces full viewport height
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Liquidism Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        // Reduced padding from p-8 md:p-12 to p-6 md:p-8
        className="relative z-10 max-w-2xl w-full border-4 border-white bg-black p-6 md:p-8 shadow-[12px_12px_0px_0px_#ef4444]"
      >
        {/* Terminal Header - reduced bottom padding and margin */}
        <div className="flex items-center gap-3 border-b-4 border-white pb-3 mb-5">
          <Terminal className="w-5 h-5 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">
            SYSTEM_ERROR // 404
          </span>
        </div>

        {/* Big Error Text - reduced text size and margin */}
        <h1 
          className="text-6xl md:text-8xl font-black text-transparent uppercase tracking-tighter mb-4"
          style={{ 
            WebkitTextStroke: "2px #ef4444", 
            textShadow: "6px 6px 0px #000" 
          }}
        >
          404
        </h1>

        {/* Heading - reduced text size and margin */}
        <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight mb-4">
          RESOURCE_NOT_FOUND
        </h2>

        {/* Warning Box - reduced padding and margin */}
        <div className="bg-gray-900/50 border-l-4 border-cyan-400 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-300 leading-relaxed">
                &gt; The route you are trying to access does not exist.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mt-1">
                &gt; Check the URL or return to the main interface.
              </p>
            </div>
          </div>
        </div>

        {/* Actions - reduced button padding and gap */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider border-4 border-black shadow-[4px_4px_0px_0px_#22d3ee] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#22d3ee] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            RETURN_HOME
          </Link>
          <Link
            href="/fix"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-cyan-400 font-bold text-xs uppercase tracking-wider border-4 border-cyan-400 shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#fff] transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            GO_TO_FIXER
          </Link>
        </div>
      </motion.div>
    </div>
  );
}