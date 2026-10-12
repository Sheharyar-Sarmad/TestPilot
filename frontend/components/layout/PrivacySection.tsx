"use client";

import { motion } from "framer-motion";

export default function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-32">
      <h2 className="font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">[ PRIVACY POLICY ]</h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 max-w-3xl border-4 border-foreground bg-background/70 p-8 shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-2xl"
      >
        <p className="font-mono text-base leading-8 tracking-wide">
          We do not store your code. All submitted code is processed in-memory and saved in Redis with a 1-hour
          TTL (Time To Live). After 1 hour, the job and all associated data are permanently deleted. We do not
          sell, share, or use your code to train our models.
        </p>
      </motion.div>
    </section>
  );
}