import { Suspense } from "react";

import { AuthLayoutContent } from "./auth-layout-content";

// Session and referral state must resolve before the auth flow can render.
export const instant = false;

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </Suspense>
  );
};

export default AuthLayout;
