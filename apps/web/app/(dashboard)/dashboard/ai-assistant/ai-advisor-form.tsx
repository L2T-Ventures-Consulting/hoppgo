"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle, Card, CardPanel, toastManager } from "@louez/ui";
import {
  AI_ADVISOR_DISPLAY_NAME_MAX_LENGTH,
  AI_ADVISOR_STORE_CONTEXT_MAX_LENGTH,
  AI_ADVISOR_WELCOME_MESSAGE_MAX_LENGTH,
  defaultAiAdvisorSettings,
} from "@louez/validations";
import type { AiAdvisorSettings } from "@louez/types";

import { updateAiAdvisorSettings } from "./actions";
import { FeatureLockedCard } from "./feature-locked-card";
import { FeaturePresentation } from "./feature-presentation";
import { FloatingSaveBar } from "@/components/dashboard/floating-save-bar";
import { FormRadioCardGroup } from "@/components/form/form-radio-card-group";
import { RootError } from "@/components/form/root-error";
import { useAppForm } from "@/hooks/form/form";

const createAiAdvisorSettingsSchema = (
  t: (key: string, params?: Record<string, string | number | Date>) => string,
) =>
  z.object({
    enabled: z.boolean(),
    mode: z.enum(["optional", "recommended", "required"]),
    storeContext: z
      .string()
      .max(
        AI_ADVISOR_STORE_CONTEXT_MAX_LENGTH,
        t("maxLength", { max: AI_ADVISOR_STORE_CONTEXT_MAX_LENGTH }),
      ),
    welcomeMessage: z
      .string()
      .max(
        AI_ADVISOR_WELCOME_MESSAGE_MAX_LENGTH,
        t("maxLength", { max: AI_ADVISOR_WELCOME_MESSAGE_MAX_LENGTH }),
      ),
    displayName: z
      .string()
      .max(
        AI_ADVISOR_DISPLAY_NAME_MAX_LENGTH,
        t("maxLength", { max: AI_ADVISOR_DISPLAY_NAME_MAX_LENGTH }),
      ),
  });

interface Store {
  id: string;
  aiAdvisorSettings: AiAdvisorSettings | null;
}

interface AiAdvisorFormProps {
  store: Store;
  hasFeatureAccess: boolean;
  aiConfigured: boolean;
}

export const AiAdvisorForm = ({ store, hasFeatureAccess, aiConfigured }: AiAdvisorFormProps) => {
  const router = useRouter();
  const t = useTranslations("dashboard.settings.aiAdvisor");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const aiAdvisorSchema = createAiAdvisorSettingsSchema(tValidation);

  const currentSettings = store.aiAdvisorSettings || defaultAiAdvisorSettings;

  const [rootError, setRootError] = useState<string | null>(null);
  const updateSettingsMutation = useMutation({
    mutationFn: updateAiAdvisorSettings,
  });

  const form = useAppForm({
    defaultValues: {
      enabled: currentSettings.enabled,
      mode: currentSettings.mode,
      storeContext: currentSettings.storeContext,
      welcomeMessage: currentSettings.welcomeMessage || "",
      displayName: currentSettings.displayName || "",
    },
    validators: { onSubmit: aiAdvisorSchema },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    onSubmit: async ({ value }) => {
      setRootError(null);
      const result = await updateSettingsMutation.mutateAsync(value);
      if (result.error) {
        setRootError(result.error);
        return;
      }
      toastManager.add({ title: t("saved"), type: "success" });
      form.options.defaultValues = value;
      form.reset();
      router.refresh();
    },
  });

  const isDirty = useStore(form.store, (s) => s.isDirty);
  const isEnabled = useStore(form.store, (s) => s.values.enabled);

  // Locked state for plans without AI advisor access
  if (!hasFeatureAccess) {
    return <FeatureLockedCard variant="advisor" />;
  }

  return (
    <form.AppForm>
      <form.Form className="space-y-6">
        <RootError error={rootError} />

        {!aiConfigured && (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>{t("notConfigured.title")}</AlertTitle>
            <AlertDescription>{t("notConfigured.description")}</AlertDescription>
          </Alert>
        )}

        {/* The page owns the heading; the card is just the surface the form sits on. */}
        <Card className="flex min-w-0 flex-col">
          <CardPanel className="flex-1 space-y-6 p-4 sm:p-5">
            {/* Enable Switch */}
            <form.AppField name="enabled">
              {(field) => (
                <field.Switch label={t("enabled")} description={t("enabledDescription")} />
              )}
            </form.AppField>

            {/* What the advisor does — sell it before it is turned on */}
            {!isEnabled && (
              <FeaturePresentation
                variant="advisor"
                onActivate={() => form.setFieldValue("enabled", true)}
              />
            )}

            {/* Configuration - Only when enabled */}
            {isEnabled && (
              <div className="space-y-6 border-t pt-6">
                {/* Checkout mode */}
                <form.Field name="mode">
                  {(field) => (
                    <FormRadioCardGroup
                      value={field.state.value}
                      onChange={(nextValue) => field.handleChange(nextValue)}
                      label={t("mode")}
                      helpText={t("modeDescription")}
                      options={[
                        {
                          value: "optional",
                          label: t("modeOptional"),
                          description: t("modeOptionalDescription"),
                        },
                        {
                          value: "recommended",
                          label: t("modeRecommended"),
                          description: t("modeRecommendedDescription"),
                        },
                        {
                          value: "required",
                          label: t("modeRequired"),
                          description: t("modeRequiredDescription"),
                        },
                      ]}
                      errors={field.state.meta.errors}
                      className="grid-cols-1 lg:grid-cols-3"
                    />
                  )}
                </form.Field>

                {/* Store context */}
                <form.AppField name="storeContext">
                  {(field) => (
                    <field.Textarea
                      label={t("storeContext")}
                      description={t("storeContextDescription")}
                      placeholder={t("storeContextPlaceholder")}
                      rows={6}
                      maxLength={AI_ADVISOR_STORE_CONTEXT_MAX_LENGTH}
                    />
                  )}
                </form.AppField>

                {/* Personalization */}
                <div className="border-t pt-6">
                  <p className="text-sm font-medium mb-4 text-muted-foreground">
                    {t("personalizationSection")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.AppField name="displayName">
                      {(field) => (
                        <field.Input
                          label={`${t("displayName")} (${tCommon("optional")})`}
                          description={t("displayNameDescription")}
                          placeholder={t("displayNamePlaceholder")}
                          maxLength={AI_ADVISOR_DISPLAY_NAME_MAX_LENGTH}
                        />
                      )}
                    </form.AppField>

                    <form.AppField name="welcomeMessage">
                      {(field) => (
                        <field.Input
                          label={`${t("welcomeMessage")} (${tCommon("optional")})`}
                          description={t("welcomeMessageDescription")}
                          placeholder={t("welcomeMessagePlaceholder")}
                          maxLength={AI_ADVISOR_WELCOME_MESSAGE_MAX_LENGTH}
                        />
                      )}
                    </form.AppField>
                  </div>
                </div>
              </div>
            )}
          </CardPanel>
        </Card>

        <FloatingSaveBar
          isDirty={isDirty}
          isLoading={updateSettingsMutation.isPending}
          onReset={() => form.reset()}
        />
      </form.Form>
    </form.AppForm>
  );
};
