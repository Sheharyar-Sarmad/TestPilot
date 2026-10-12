"use client";

import { useEffect, useState } from "react";

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Render nothing on the server + first client paint to avoid hydration mismatch
  if (year === null) return null;

  return <>{year}</>;
}