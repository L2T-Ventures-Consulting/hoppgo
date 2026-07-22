"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/env";
import { Button } from "@louez/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@louez/ui";
import {
  AccentSparklesIcon,
  ExternalLinkIcon,
  FileCheckIcon,
  FileTextIcon,
  InfoCircleIcon,
} from "@louez/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@louez/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toastManager } from "@louez/ui";
import { getCgvTemplate, getLegalNoticeTemplate } from "@/lib/legal-templates";
import { FloatingSaveBar } from "@/components/dashboard/floating-save-bar";
import { useAppForm } from "@/hooks/form/form";
import { orpc } from "@/lib/orpc/react";

interface Store {
  id: string;
  name: string;
  slug: string;
  cgv: string | null;
  legalNotice: string | null;
  includeCgvInContract: boolean;
}

interface LegalPagesFormProps {
  store: Store;
}

export const LegalPagesForm = ({ store }: LegalPagesFormProps) => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.settings.legalSettings");
  const tErrors = useTranslations("errors");
  const [activeTab, setActiveTab] = useState("cgv");

  const updateLegalMutation = useMutation(orpc.dashboard.settings.updateLegal.mutationOptions());

  const form = useAppForm({
    defaultValues: {
      cgv: store.cgv ?? "",
      legalNotice: store.legalNotice ?? "",
      includeFullCgvInContract: store.includeCgvInContract ?? false,
    },
    validators: {
      onSubmit: z.object({
        cgv: z.string(),
        legalNotice: z.string(),
        includeFullCgvInContract: z.boolean(),
      }),
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    onSubmit: async ({ value }) => {
      try {
        await updateLegalMutation.mutateAsync(value);
        toastManager.add({ title: t("updated"), type: "success" });
        form.options.defaultValues = value;
        form.reset();
        router.refresh();
      } catch {
        toastManager.add({ title: tErrors("generic"), type: "error" });
      }
    },
  });

  const isDirty = useStore(form.store, (state) => state.isDirty);

  const handleUseTemplate = (type: "cgv" | "legal") => {
    if (type === "cgv") {
      form.setFieldValue("cgv", getCgvTemplate(locale));
      setActiveTab("cgv");
    } else {
      form.setFieldValue("legalNotice", getLegalNoticeTemplate(locale));
      setActiveTab("legal");
    }
    toastManager.add({ title: t("templateApplied"), type: "success" });
  };

  return (
    <form.AppForm>
      <form.Form className="space-y-6">
        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 shrink-0" />
              {t("editor")}
            </CardTitle>
            <CardDescription>{t("editorDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates quick-fill */}
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AccentSparklesIcon className="size-4 shrink-0 text-primary" />
                  {t("templates")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate("cgv")}
                  >
                    {t("cgvTemplate")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate("legal")}
                  >
                    {t("legalNoticeTemplate")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("templatesDisclaimer")}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="cgv">{t("cgv")}</TabsTrigger>
                <TabsTrigger value="legal">{t("legalNotice")}</TabsTrigger>
              </TabsList>

              <TabsContent value="cgv" className="space-y-4">
                <form.Field name="cgv">
                  {(field) => (
                    <RichTextEditor
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                      placeholder={t("cgvPlaceholder")}
                      className="min-h-[400px]"
                    />
                  )}
                </form.Field>
                <div className="flex items-center justify-end">
                  {store.slug && (
                    <Button
                      type="button"
                      variant="ghost"
                      render={
                        <a
                          href={`https://${store.slug}.${env.NEXT_PUBLIC_APP_DOMAIN}/terms`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        />
                      }
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                      {t("viewOnStore")}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="legal" className="space-y-4">
                <form.Field name="legalNotice">
                  {(field) => (
                    <RichTextEditor
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                      placeholder={t("legalNoticePlaceholder")}
                      className="min-h-[400px]"
                    />
                  )}
                </form.Field>
                <div className="flex items-center justify-end">
                  {store.slug && (
                    <Button
                      type="button"
                      variant="ghost"
                      render={
                        <a
                          href={`https://${store.slug}.${env.NEXT_PUBLIC_APP_DOMAIN}/legal`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        />
                      }
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                      {t("viewOnStore")}
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheckIcon className="h-5 w-5 shrink-0" />
              {t("contractPdfSettingsTitle")}
            </CardTitle>
            <CardDescription>{t("contractPdfSettingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form.AppField name="includeFullCgvInContract">
              {(field) => (
                <field.Switch
                  label={t("includeFullCgvInContract")}
                  description={t("includeFullCgvInContractHelp")}
                />
              )}
            </form.AppField>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfoCircleIcon className="h-5 w-5 shrink-0" />
              {t("tips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>{t("tip1")}</li>
              <li>{t("tip2")}</li>
              <li>{t("tip3")}</li>
              <li>{t("tip4")}</li>
              <li>{t("tip5")}</li>
            </ul>
          </CardContent>
        </Card>

        <FloatingSaveBar
          isDirty={isDirty}
          isLoading={updateLegalMutation.isPending}
          onReset={() => form.reset()}
        />
      </form.Form>
    </form.AppForm>
  );
};
