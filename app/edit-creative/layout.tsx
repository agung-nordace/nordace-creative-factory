import NdWorkspaceShell from "@/components/nd-workspace-shell";

export default function WorkspaceRouteLayout({
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
