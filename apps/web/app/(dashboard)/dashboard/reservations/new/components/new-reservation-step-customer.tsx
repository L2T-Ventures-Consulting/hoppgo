"use client";

import { useState } from "react";

import { User, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";

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
  const tCustomerSearch = useTranslations("common.customerSearch");
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <CustomerCombobox
                    className="sm:flex-1"
                    customers={customers}
                    value={field.state.value}
                    onValueChange={(value) => {
                      field.handleChange(value);
                      clearStepFieldError("customerId");
                    }}
                    onCreateRequest={(query) => setCreateDialog({ isOpen: true, query })}
                  />
                  <Button
                    className="h-11 shrink-0 max-sm:w-full"
                    onClick={() => setCreateDialog({ isOpen: true, query: "" })}
                    type="button"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4" />
                    {tCustomerSearch("createCustomer")}
                  </Button>
                </div>
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
