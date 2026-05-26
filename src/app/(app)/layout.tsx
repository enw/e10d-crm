import { AppShell } from "@/components/app-shell";
import { isLeadPureConfigured } from "@/lib/enrichment/leadpure";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell leadPureEnabled={isLeadPureConfigured()}>{children}</AppShell>
  );
}
