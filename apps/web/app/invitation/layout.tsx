import { Suspense } from "react";

import { InvitationLayoutContent } from "./invitation-layout-content";

// Invitation state is token- and request-dependent.
export const instant = false;

const InvitationLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <InvitationLayoutContent>{children}</InvitationLayoutContent>
    </Suspense>
  );
};

export default InvitationLayout;
