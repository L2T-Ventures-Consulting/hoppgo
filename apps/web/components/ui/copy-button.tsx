"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "@louez/ui";

type CopyButtonProps = {
  /** Text copied to the clipboard on click. */
  value: string;
  /** Optional visible label next to the icon. */
  label?: string;
  /** Optional label shown while in the copied state. */
  copiedLabel?: string;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

export const CopyButton = ({
  value,
  label,
  copiedLabel,
  className,
  size = "icon",
  variant = "ghost",
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" size={size} variant={variant} className={className} onClick={handleCopy}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? (copiedLabel ?? label) : label}
    </Button>
  );
};
