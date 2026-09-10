import NdWorkspaceShell from "@/components/nd-workspace-shell";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NdWorkspaceShell>
      {children}
    </NdWorkspaceShell>
  );
}
