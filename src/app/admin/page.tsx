import type { Metadata } from "next";
import AdminPage from "@/components/AdminPage";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.adminTitle} — ${t.siteTitle}`,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPage />;
}
