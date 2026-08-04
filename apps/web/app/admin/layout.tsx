import { Suspense } from "react";

import { AdminLayoutContent } from "./admin-layout-content";

// The platform-admin authorization gate must resolve before rendering.
export const instant = false;

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
};

export default AdminLayout;
