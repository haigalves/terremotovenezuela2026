"use client";

import dynamic from "next/dynamic";
import { t } from "@/lib/i18n";
import type { ReliefMapProps } from "./ReliefMap";

const ReliefMap = dynamic(() => import("./ReliefMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full min-h-[320px] items-center justify-center rounded-lg bg-slate-100 text-slate-700"
      role="status"
      aria-live="polite"
    >
      {t.loading}
    </div>
  ),
});

export default function ReliefMapLoader(props: ReliefMapProps) {
  return <ReliefMap {...props} />;
}
