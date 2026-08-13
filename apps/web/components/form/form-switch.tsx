"use client";

import { useFieldContext } from "@/hooks/form/form-context";
import { Label, Switch } from "@louez/ui";

export function FormSwitch({
  label,
  description,
  className,
  disabled,
  icon,
}: {
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const field = useFieldContext<boolean>();

  return (
    <div
      className={className ?? "flex flex-row items-center justify-between rounded-lg border p-4"}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <div className="space-y-0.5">
          {label && (
            <Label htmlFor={field.name} className="text-base">
              {label}
            </Label>
          )}
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      </div>
      <Switch
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        disabled={disabled}
      />
    </div>
  );
}
