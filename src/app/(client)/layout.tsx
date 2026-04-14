import { ClientShell } from "@/components/client/client-shell";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}
