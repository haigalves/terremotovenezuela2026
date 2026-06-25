import type { Metadata } from "next";
import AdminPage from "@/components/AdminPage";
import { es } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${es.adminTitle} — ${es.siteTitle}`,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPage />;
}
