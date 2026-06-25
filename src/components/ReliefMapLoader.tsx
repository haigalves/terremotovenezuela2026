"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "@/components/LocaleProvider";
import type { ReliefMapProps } from "./ReliefMap";

function MapLoading() {
  const { t } = useTranslation();
  return (
    <div
      className="flex h-full min-h-[320px] items-center justify-center rounded-lg bg-slate-100 text-slate-700"
      role="status"
      aria-live="polite"
    >
      {t.loading}
    </div>
  );
}

const ReliefMap = dynamic(() => import("./ReliefMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function ReliefMapLoader(props: ReliefMapProps) {
  return <ReliefMap {...props} />;
}
