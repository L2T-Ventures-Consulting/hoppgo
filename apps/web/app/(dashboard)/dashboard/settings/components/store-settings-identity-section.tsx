"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@louez/ui";
import { Label } from "@louez/ui";
import { ExternalLinkIcon, StoreIcon } from "@louez/ui/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";

import { AddressInput } from "@/components/ui/address-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getFieldError } from "@/hooks/form/form-context";
import { useStorefrontUrl } from "@/hooks/use-storefront-url";
import { SUPPORTED_CURRENCIES, getDefaultCurrencyForCountry } from "@/lib/utils/currency";

interface StoreSettingsIdentitySectionProps {
  form: any;
  storeSlug: string;
  latitude: number | null;
  longitude: number | null;
  onOpenSlugModal: () => void;
}

export function StoreSettingsIdentitySection({
  form,
  storeSlug,
  latitude,
  longitude,
  onOpenSlugModal,
}: StoreSettingsIdentitySectionProps) {
  const t = useTranslations("dashboard.settings");
  const { getAbsoluteUrl } = useStorefrontUrl(storeSlug);
  const storefrontUrl = getAbsoluteUrl();
  const storefrontLabel = storefrontUrl.replace(/^https?:\/\//, "");

  const handleCountryChange = (newCountry: string) => {
    form.setFieldValue("currency", getDefaultCurrencyForCountry(newCountry));
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 shrink-0" />
          {t("storeSettings.generalInfo")}
        </CardTitle>
        <CardDescription>{t("storeSettings.generalInfoDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <form.AppField name="name">
          {(field: any) => <field.Input label={`${t("storeSettings.name")} *`} />}
        </form.AppField>

        <form.Field name="description">
          {(field: any) => (
            <div className="grid gap-2 min-w-0">
              <Label htmlFor={field.name}>{t("storeSettings.descriptionLabel")}</Label>
              <RichTextEditor
                value={field.state.value || ""}
                onChange={(value) => field.handleChange(value)}
                placeholder={t("storeSettings.descriptionPlaceholder")}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-destructive text-sm">
                  {getFieldError(field.state.meta.errors[0])}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <form.AppField name="email">
            {(field: any) => (
              <field.Input
                label={t("storeSettings.email")}
                type="email"
                placeholder="contact@example.com"
              />
            )}
          </form.AppField>

          <form.AppField name="phone">
            {(field: any) => (
              <field.Input label={t("storeSettings.phone")} placeholder="01 23 45 67 89" />
            )}
          </form.AppField>
        </div>

        <form.Field name="address">
          {(field: any) => (
            <div className="grid min-w-0 gap-2">
              <Label htmlFor={field.name}>{t("storeSettings.address")}</Label>
              <AddressInput
                value={field.state.value || ""}
                latitude={latitude}
                longitude={longitude}
                onChange={(address, lat, lng, displayAddress) => {
                  field.handleChange(displayAddress || address);
                  form.setFieldValue("latitude", lat);
                  form.setFieldValue("longitude", lng);
                }}
                placeholder={t("storeSettings.addressPlaceholder")}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-destructive text-sm">
                  {getFieldError(field.state.meta.errors[0])}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <form.AppField name="country">
            {(field: any) => (
              <field.CountrySelect
                label={t("storeSettings.country")}
                onValueChange={handleCountryChange}
              />
            )}
          </form.AppField>

          <form.AppField name="currency">
            {(field: any) => (
              <field.CurrencySelect
                label={t("storeSettings.currency")}
                currencies={SUPPORTED_CURRENCIES}
              />
            )}
          </form.AppField>
        </div>

        <div className="flex min-w-0 items-center justify-between rounded-lg border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-sm">
              {t("storeSettings.storeUrl")}
            </span>
            <code className="truncate font-mono text-sm">{storefrontLabel}</code>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
          <Button type="button" variant="ghost" onClick={onOpenSlugModal} className="ml-2 shrink-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
