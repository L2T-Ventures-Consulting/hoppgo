"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";
import { FileTextIcon } from "@louez/ui/icons";

import { ProductInfoFields, type ProductInfoFieldsProps } from "./product-info-fields";

type ProductFormStepInfoProps = ProductInfoFieldsProps;

export function ProductFormStepInfo(props: ProductFormStepInfoProps) {
  const t = useTranslations("dashboard.products.form");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5 shrink-0" />
          {t("information")}
        </CardTitle>
        <CardDescription>{t("informationDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ProductInfoFields {...props} />
      </CardContent>
    </Card>
  );
}
