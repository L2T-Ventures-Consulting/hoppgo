import { db } from "@louez/db";
import {
  customerNotificationTemplateSchema,
  getCustomerTemplateInputSchema,
  pushSubscriptionSchema,
  unsubscribePushSchema,
  updateAdminReminderSettingsInputSchema,
  updateCustomerPreferenceInputSchema,
  updateCustomerTemplateInputSchema,
  updateReminderSettingsInputSchema,
  updateSinglePreferenceSchema,
} from "@louez/validations";
import { z } from "zod";

import { dashboardProcedure } from "../../procedures";
import {
  ApiServiceError,
  getCustomerNotificationTemplate,
  updateAdminNotificationReminderSettings,
  updateCustomerNotificationPreference,
  updateCustomerNotificationTemplate,
  updateCustomerReminderSettings,
  updateSingleNotificationPreference,
} from "../../services";
import {
  listPushSubscriptions,
  subscribePush,
  unsubscribePush,
} from "../../services/push-notifications";
import { toORPCError } from "../../utils/orpc-error";

const successOutputSchema = z.object({ success: z.literal(true) });

const getSessionUserId = (userId: string | undefined) => {
  if (!userId) {
    throw new ApiServiceError("UNAUTHORIZED", "errors.unauthorized");
  }

  return userId;
};

// Register the current user's device for web push (per-device, upserted by
// endpoint). Which events actually push is decided by the store's
// notificationSettings; this just stores the delivery target.
const subscribe = dashboardProcedure
  .input(pushSubscriptionSchema)
  .handler(async ({ context, input }) => {
    try {
      return await subscribePush({
        db,
        userId: getSessionUserId(context.session.user?.id),
        storeId: context.store.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const unsubscribe = dashboardProcedure
  .input(unsubscribePushSchema)
  .handler(async ({ context, input }) => {
    try {
      return await unsubscribePush({
        db,
        userId: getSessionUserId(context.session.user?.id),
        endpoint: input.endpoint,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const list = dashboardProcedure.handler(async ({ context }) => {
  try {
    return await listPushSubscriptions({
      db,
      userId: getSessionUserId(context.session.user?.id),
    });
  } catch (error) {
    throw toORPCError(error);
  }
});

const updateSinglePreference = dashboardProcedure
  .input(updateSinglePreferenceSchema)
  .output(successOutputSchema)
  .handler(async ({ context, input }) => {
    try {
      return await updateSingleNotificationPreference({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const updateCustomerPreference = dashboardProcedure
  .input(updateCustomerPreferenceInputSchema)
  .output(successOutputSchema)
  .handler(async ({ context, input }) => {
    try {
      return await updateCustomerNotificationPreference({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const getCustomerTemplate = dashboardProcedure
  .input(getCustomerTemplateInputSchema)
  .output(z.object({ template: customerNotificationTemplateSchema }))
  .handler(async ({ context, input }) => {
    try {
      return await getCustomerNotificationTemplate({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const updateCustomerTemplate = dashboardProcedure
  .input(updateCustomerTemplateInputSchema)
  .output(successOutputSchema)
  .handler(async ({ context, input }) => {
    try {
      return await updateCustomerNotificationTemplate({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const updateReminderSettings = dashboardProcedure
  .input(updateReminderSettingsInputSchema)
  .output(successOutputSchema)
  .handler(async ({ context, input }) => {
    try {
      return await updateCustomerReminderSettings({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

const updateAdminReminderSettings = dashboardProcedure
  .input(updateAdminReminderSettingsInputSchema)
  .output(successOutputSchema)
  .handler(async ({ context, input }) => {
    try {
      return await updateAdminNotificationReminderSettings({
        storeId: context.store.id,
        input,
      });
    } catch (error) {
      throw toORPCError(error);
    }
  });

export const dashboardNotificationsRouter = {
  subscribe,
  unsubscribe,
  list,
  updateSinglePreference,
  updateCustomerPreference,
  getCustomerTemplate,
  updateCustomerTemplate,
  updateReminderSettings,
  updateAdminReminderSettings,
};
