import { ClientShell } from "@/components/client/client-shell";
import { PwaRegister } from "@/components/client/pwa-register";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PwaRegister />
      <ClientShell>{children}</ClientShell>
    </>
  );
}
