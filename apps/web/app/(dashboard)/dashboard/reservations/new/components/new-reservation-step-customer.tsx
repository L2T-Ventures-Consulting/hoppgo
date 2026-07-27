"use client";

import { useState } from "react";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";

import { CustomerCombobox } from "@/components/dashboard/customer-combobox";
import { CustomerCreateDialog } from "@/components/dashboard/customer-create-dialog";
import { parseCustomerQuery } from "@/components/dashboard/util.customer-query";

import type { Customer, NewReservationFormComponentApi, StepFieldName } from "../types";

interface NewReservationStepCustomerProps {
  form: NewReservationFormComponentApi;
  customers: Customer[];
  clearStepFieldError: (name: StepFieldName) => void;
  getFieldErrorMessage: (error: unknown) => string;
  onCustomerCreated: (customer: Customer) => void;
}

export function NewReservationStepCustomer({
  form,
  customers,
  clearStepFieldError,
  getFieldErrorMessage,
  onCustomerCreated,
}: NewReservationStepCustomerProps) {
  const t = useTranslations("dashboard.reservations.manualForm");
  const [createDialog, setCreateDialog] = useState({ isOpen: false, query: "" });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("customer")}
          </CardTitle>
          <CardDescription>{t("customerStepDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="customerId">
            {(field) => (
              <div className="space-y-2">
                <CustomerCombobox
                  customers={customers}
                  value={field.state.value}
                  onValueChange={(value) => {
                    field.handleChange(value);
                    clearStepFieldError("customerId");
                  }}
                  onCreateRequest={(query) => setCreateDialog({ isOpen: true, query })}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm font-medium text-destructive">
                    {getFieldErrorMessage(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <CustomerCreateDialog
        open={createDialog.isOpen}
        onOpenChange={(isOpen) => setCreateDialog((prev) => ({ ...prev, isOpen }))}
        prefill={parseCustomerQuery(createDialog.query)}
        onCreated={onCustomerCreated}
      />
    </>
  );
}
