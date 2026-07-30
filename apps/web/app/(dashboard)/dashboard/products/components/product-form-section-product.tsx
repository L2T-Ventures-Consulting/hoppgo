"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";
import { ProductIcon } from "@louez/ui/icons";

import { ProductInfoFields, type ProductInfoFieldsProps } from "./product-info-fields";
import { ProductMediaFields, type ProductMediaFieldsProps } from "./product-media-fields";

type ProductFormSectionProductProps = ProductInfoFieldsProps &
  Omit<ProductMediaFieldsProps, "showPhotosLabel">;

export function ProductFormSectionProduct(props: ProductFormSectionProductProps) {
  const t = useTranslations("dashboard.products.form");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProductIcon className="h-5 w-5 shrink-0" />
          {t("productSection")}
        </CardTitle>
        <CardDescription>{t("productSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProductMediaFields
          form={props.form}
          imagesPreviews={props.imagesPreviews}
          isDragging={props.isDragging}
          isUploadingImages={props.isUploadingImages}
          handleImageUpload={props.handleImageUpload}
          handleDragOver={props.handleDragOver}
          handleDragEnter={props.handleDragEnter}
          handleDragLeave={props.handleDragLeave}
          handleDrop={props.handleDrop}
          removeImage={props.removeImage}
          setMainImage={props.setMainImage}
          recropImage={props.recropImage}
          canRecrop={props.canRecrop}
          imageEnhance={props.imageEnhance}
          showPhotosLabel
        />

        <ProductInfoFields
          form={props.form}
          showAiContext={props.showAiContext}
          categories={props.categories}
          onCreateCategory={props.onCreateCategory}
          isCreatingCategory={props.isCreatingCategory}
          onNameInputChange={props.onNameInputChange}
        />
      </CardContent>
    </Card>
  );
}
