import { Suspense } from "react";

import { MultiStoreLayoutContent } from "./multi-store-layout-content";

// Session, store memberships, and platform-admin status are request-bound.
export const instant = false;

const MultiStoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <MultiStoreLayoutContent>{children}</MultiStoreLayoutContent>
    </Suspense>
  );
};

export default MultiStoreLayout;
