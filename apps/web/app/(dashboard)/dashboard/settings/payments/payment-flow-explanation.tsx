"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@louez/ui";
import {
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  FastPaymentIcon,
  FileCheckIcon,
  MailIcon,
  WarningIcon,
  ZapIcon,
} from "@louez/ui/icons";

interface PaymentFlowExplanationProps {
  reservationMode: "payment" | "request";
  stripeChargesEnabled: boolean;
  onConnectStripe?: () => Promise<void>;
  isConnecting?: boolean;
}

// Hook to animate through steps sequentially
function useStepAnimation(totalSteps: number, intervalMs: number = 2000) {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= totalSteps ? 1 : prev + 1));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [totalSteps, intervalMs]);

  return activeStep;
}

export function PaymentFlowExplanation({
  reservationMode,
  stripeChargesEnabled,
  onConnectStripe,
  isConnecting = false,
}: PaymentFlowExplanationProps) {
  const t = useTranslations("dashboard.settings.payments.flowExplanation");

  // Determine the current scenario
  const isRequestMode = reservationMode === "request";
  const isPaymentMode = reservationMode === "payment";
  const hasStripe = stripeChargesEnabled;

  // Determine number of steps based on scenario
  const getStepCount = () => {
    if (isPaymentMode && hasStripe) return 3;
    return 4;
  };

  // Animation: cycle through steps every 2 seconds
  const activeStep = useStepAnimation(getStepCount(), 2000);

  // Scenario: Request mode without Stripe
  if (isRequestMode && !hasStripe) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 shrink-0 text-primary" />
                {t("title")}
              </CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <FileCheckIcon className="h-3 w-3" />
              {t("modes.request")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current flow */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t("currentFlow")}</h4>
            <div className="flex flex-col gap-2">
              <FlowStep
                number={1}
                icon={FileCheckIcon}
                text={t("steps.requestSubmitted")}
                isActive={activeStep === 1}
              />
              <FlowStep
                number={2}
                icon={MailIcon}
                text={t("steps.youReview")}
                isActive={activeStep === 2}
              />
              <FlowStep
                number={3}
                icon={CheckCircleIcon}
                text={t("steps.acceptOrReject")}
                isActive={activeStep === 3}
              />
              <FlowStep
                number={4}
                icon={CreditCardIcon}
                text={t("steps.paymentOnSite")}
                isActive={activeStep === 4}
              />
            </div>
          </div>

          {/* Suggestion */}
          <Alert variant="info">
            <Lightbulb />
            <AlertTitle>{t("suggestions.enableStripe.title")}</AlertTitle>
            <AlertDescription>{t("suggestions.enableStripe.description")}</AlertDescription>
            {onConnectStripe && (
              <AlertAction>
                <Button onClick={onConnectStripe} isPending={isConnecting}>
                  {t("suggestions.enableStripe.action")}
                </Button>
              </AlertAction>
            )}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Scenario: Request mode with Stripe
  if (isRequestMode && hasStripe) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 shrink-0 text-primary" />
                {t("title")}
              </CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <FileCheckIcon className="h-3 w-3" />
                {t("modes.request")}
              </Badge>
              <Badge variant="default" className="gap-1">
                <CreditCardIcon className="h-3 w-3" />
                {t("modes.stripeActive")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current flow */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t("currentFlow")}</h4>
            <div className="flex flex-col gap-2">
              <FlowStep
                number={1}
                icon={FileCheckIcon}
                text={t("steps.requestSubmitted")}
                isActive={activeStep === 1}
              />
              <FlowStep
                number={2}
                icon={MailIcon}
                text={t("steps.youReview")}
                isActive={activeStep === 2}
              />
              <FlowStep
                number={3}
                icon={CheckCircleIcon}
                text={t("steps.acceptOrReject")}
                isActive={activeStep === 3}
              />
              <FlowStep
                number={4}
                icon={CreditCardIcon}
                text={t("steps.paymentOnlineOrSite")}
                isActive={activeStep === 4}
              />
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">{t("info.requestWithStripe")}</p>
          </div>

          {/* Suggestion */}
          <Alert variant="info">
            <Lightbulb />
            <AlertTitle>{t("suggestions.instantPayment.title")}</AlertTitle>
            <AlertDescription>{t("suggestions.instantPayment.description")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Scenario: Payment mode without Stripe (should not happen, but handle it)
  if (isPaymentMode && !hasStripe) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <WarningIcon className="h-5 w-5 shrink-0 text-destructive" />
                {t("title")}
              </CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </div>
            <Badge variant="error" className="gap-1">
              <WarningIcon className="h-3 w-3" />
              {t("modes.configRequired")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert variant="error">
            <WarningIcon />
            <AlertTitle>{t("warnings.noStripeWithPayment.title")}</AlertTitle>
            <AlertDescription>{t("warnings.noStripeWithPayment.description")}</AlertDescription>
            {onConnectStripe && (
              <AlertAction>
                <Button onClick={onConnectStripe} isPending={isConnecting}>
                  {t("suggestions.enableStripe.action")}
                </Button>
              </AlertAction>
            )}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Scenario: Payment mode with Stripe (ideal)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FastPaymentIcon className="h-5 w-5 shrink-0 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="default" className="gap-1">
              <ZapIcon className="h-3 w-3" />
              {t("modes.instant")}
            </Badge>
            <Badge variant="default" className="gap-1">
              <CreditCardIcon className="h-3 w-3" />
              {t("modes.stripeActive")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current flow */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">{t("currentFlow")}</h4>
          <div className="flex flex-col gap-2">
            <FlowStep
              number={1}
              icon={CreditCardIcon}
              text={t("steps.customerPays")}
              isActive={activeStep === 1}
            />
            <FlowStep
              number={2}
              icon={CheckCircleIcon}
              text={t("steps.reservationConfirmed")}
              isActive={activeStep === 2}
            />
            <FlowStep
              number={3}
              icon={MailIcon}
              text={t("steps.bothNotified")}
              isActive={activeStep === 3}
            />
          </div>
        </div>

        {/* Info box */}
        <Alert variant="success">
          <CheckCircleIcon />
          <AlertDescription>{t("info.instantPayment")}</AlertDescription>
        </Alert>

        {/* Alternative */}
        <Alert>
          <Lightbulb />
          <AlertTitle>{t("alternatives.requestMode.title")}</AlertTitle>
          <AlertDescription>{t("alternatives.requestMode.description")}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

interface FlowStepProps {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  isActive?: boolean;
}

function FlowStep({ number, icon: Icon, text, isActive }: FlowStepProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-300 ease-in-out ${
        isActive ? "border-primary/40 bg-primary/5" : "border-transparent bg-muted/50"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted-foreground/20 text-muted-foreground"
        }`}
      >
        {number}
      </div>
      <Icon
        className={`h-4 w-4 shrink-0 transition-all duration-300 ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      />
      <span
        className={`text-sm transition-all duration-300 ${
          isActive ? "font-medium text-foreground" : ""
        }`}
      >
        {text}
      </span>
    </div>
  );
}
