import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@louez/ui";
import { InfoCircleIcon } from "@louez/ui/icons";

type InfoCalloutProps = {
  children: ReactNode;
  className?: string;
};

export const InfoCallout = ({ children, className }: InfoCalloutProps) => (
  <Alert variant="info" className={className}>
    <InfoCircleIcon />
    <AlertDescription>{children}</AlertDescription>
  </Alert>
);
