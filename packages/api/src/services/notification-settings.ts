import { db, stores } from "@louez/db";
import {
  DEFAULT_CUSTOMER_NOTIFICATION_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  type AdminReminderMode,
  type CustomerNotificationSettings,
  type NotificationSettings,
} from "@louez/types";
import type {
  GetCustomerTemplateInput,
  UpdateAdminReminderSettingsInput,
  UpdateCustomerPreferenceInput,
  UpdateCustomerTemplateInput,
  UpdateReminderSettingsInput,
  UpdateSinglePreferenceInput,
} from "@louez/validations";
import { eq } from "drizzle-orm";

import { ApiServiceError } from "./errors";

interface StoreParams {
  storeId: string;
}

interface UpdateSinglePreferenceParams extends StoreParams {
  input: UpdateSinglePreferenceInput;
}

interface UpdateCustomerPreferenceParams extends StoreParams {
  input: UpdateCustomerPreferenceInput;
}

interface CustomerTemplateParams extends StoreParams {
  input: GetCustomerTemplateInput;
}

interface UpdateCustomerTemplateParams extends StoreParams {
  input: UpdateCustomerTemplateInput;
}

interface UpdateReminderSettingsParams extends StoreParams {
  input: UpdateReminderSettingsInput;
}

interface UpdateAdminReminderSettingsParams extends StoreParams {
  input: UpdateAdminReminderSettingsInput;
}

const getNotificationSettings = async (storeId: string) => {
  const store = await db.query.stores.findFirst({
    columns: {
      notificationSettings: true,
      customerNotificationSettings: true,
    },
    where: eq(stores.id, storeId),
  });

  if (!store) {
    throw new ApiServiceError("NOT_FOUND", "errors.storeNotFound");
  }

  return store;
};

export const updateSingleNotificationPreference = async ({
  storeId,
  input,
}: UpdateSinglePreferenceParams) => {
  const store = await getNotificationSettings(storeId);
  const currentSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...store.notificationSettings,
  };
  const currentEventSettings = currentSettings[input.eventType];
  const updatedSettings: NotificationSettings = {
    ...currentSettings,
    [input.eventType]: {
      ...currentEventSettings,
      [input.channel]: input.enabled,
    },
  };

  await db
    .update(stores)
    .set({
      notificationSettings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  return { success: true } satisfies { success: true };
};

export const updateCustomerNotificationPreference = async ({
  storeId,
  input,
}: UpdateCustomerPreferenceParams) => {
  const store = await getNotificationSettings(storeId);
  const currentSettings: CustomerNotificationSettings =
    store.customerNotificationSettings ?? DEFAULT_CUSTOMER_NOTIFICATION_SETTINGS;
  const currentEventSettings = currentSettings[input.eventType];
  const updatedSettings: CustomerNotificationSettings = {
    ...currentSettings,
    [input.eventType]: {
      ...currentEventSettings,
      [input.channel]: input.enabled,
      enabled: input.enabled ? true : currentEventSettings.enabled,
    },
  };

  await db
    .update(stores)
    .set({
      customerNotificationSettings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  return { success: true } satisfies { success: true };
};

export const getCustomerNotificationTemplate = async ({
  storeId,
  input,
}: CustomerTemplateParams) => {
  const store = await getNotificationSettings(storeId);
  const settings = store.customerNotificationSettings ?? DEFAULT_CUSTOMER_NOTIFICATION_SETTINGS;

  return { template: settings.templates?.[input.eventType] ?? {} };
};

export const updateCustomerNotificationTemplate = async ({
  storeId,
  input,
}: UpdateCustomerTemplateParams) => {
  const store = await getNotificationSettings(storeId);
  const currentSettings: CustomerNotificationSettings =
    store.customerNotificationSettings ?? DEFAULT_CUSTOMER_NOTIFICATION_SETTINGS;
  const updatedSettings: CustomerNotificationSettings = {
    ...currentSettings,
    templates: {
      ...currentSettings.templates,
      [input.eventType]: input.template,
    },
  };

  await db
    .update(stores)
    .set({
      customerNotificationSettings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  return { success: true } satisfies { success: true };
};

export const updateCustomerReminderSettings = async ({
  storeId,
  input,
}: UpdateReminderSettingsParams) => {
  const store = await getNotificationSettings(storeId);
  const currentSettings: CustomerNotificationSettings =
    store.customerNotificationSettings ?? DEFAULT_CUSTOMER_NOTIFICATION_SETTINGS;
  const updatedSettings: CustomerNotificationSettings = {
    ...currentSettings,
    reminderSettings: {
      pickupReminderHours: input.pickupReminderHours,
      returnReminderHours: input.returnReminderHours,
    },
  };

  await db
    .update(stores)
    .set({
      customerNotificationSettings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  return { success: true } satisfies { success: true };
};

export const updateAdminNotificationReminderSettings = async ({
  storeId,
  input,
}: UpdateAdminReminderSettingsParams) => {
  const store = await getNotificationSettings(storeId);
  const currentSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...store.notificationSettings,
  };
  const currentTiming = currentSettings.reminderSettings ?? {
    pickupReminderHours: 24,
    returnReminderHours: 24,
    mode: "per_reservation" satisfies AdminReminderMode,
    digestHour: 8,
  };
  const updatedSettings: NotificationSettings = {
    ...currentSettings,
    reminderSettings: {
      pickupReminderHours: input.pickupReminderHours,
      returnReminderHours: input.returnReminderHours,
      mode: input.mode ?? currentTiming.mode ?? "per_reservation",
      digestHour: input.digestHour ?? currentTiming.digestHour ?? 8,
    },
  };

  await db
    .update(stores)
    .set({
      notificationSettings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  return { success: true } satisfies { success: true };
};
