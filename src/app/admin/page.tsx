import type { Metadata } from "next";
import ClosedSite from "@/components/ClosedSite";

export const metadata: Metadata = {
  title: "Sitio cerrado",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ClosedSite />;
}
