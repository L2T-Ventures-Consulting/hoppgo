"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { ArrowRight, Bot, Lock, TriangleAlert, Zap } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  toastManager,
} from "@louez/ui";
import {
  AI_ADVISOR_DISPLAY_NAME_MAX_LENGTH,
  AI_ADVISOR_STORE_CONTEXT_MAX_LENGTH,
  AI_ADVISOR_WELCOME_MESSAGE_MAX_LENGTH,
  defaultAiAdvisorSettings,
} from "@louez/validations";
import type { AiAdvisorSettings } from "@louez/types";

import { updateAiAdvisorSettings } from "./actions";
import { FeaturePresentation } from "./feature-presentation";
import { FloatingSaveBar } from "@/components/dashboard/floating-save-bar";
import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";
import { DashboardSectionCard } from "@/components/dashboard/shared/dashboard-section-card";
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
    return (
      <div className="space-y-6">
        {/* Locked Banner */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <DashboardIconTile icon={Bot} accent="primary" />
                <div className="min-w-0">
                  <h3 className="font-semibold">{t("locked.title")}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{t("locked.description")}</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/dashboard/subscription")}
                className="w-full shrink-0 gap-2 sm:w-auto"
              >
                <Zap className="h-4 w-4" />
                {t("locked.upgrade")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview of features (locked) */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center p-6">
              <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">{t("locked.featureLocked")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("locked.upgradeToUnlock")}</p>
            </div>
          </div>
          <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
            <DashboardIconTile icon={Bot} accent="primary" />
            <CardTitle className="text-base">{t("enableSection")}</CardTitle>
          </CardHeader>
          <CardContent className="pointer-events-none space-y-4 p-4 pt-0 opacity-50 sm:p-5 sm:pt-0">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t("enabled")}</span>
              <Switch disabled />
            </div>
            <div className="bg-muted/50 h-24 rounded-md border" />
          </CardContent>
        </Card>
      </div>
    );
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

        <DashboardSectionCard
          title={t("enableSection")}
          description={t("enableSectionDescription")}
          icon={Bot}
          accent="progress"
          contentClassName="space-y-6"
        >
          <>
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
          </>
        </DashboardSectionCard>

        <FloatingSaveBar
          isDirty={isDirty}
          isLoading={updateSettingsMutation.isPending}
          onReset={() => form.reset()}
        />
      </form.Form>
    </form.AppForm>
  );
};
