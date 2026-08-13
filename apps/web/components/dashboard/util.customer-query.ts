const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{6,}$/;

export interface CustomerQueryPrefill {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const EMPTY_PREFILL: CustomerQueryPrefill = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
};

/**
 * Turns whatever was typed in the customer search into a best-effort prefill for
 * the quick-create dialog, so a failed search is never retyped from scratch.
 */
export function parseCustomerQuery(query: string): CustomerQueryPrefill {
  const trimmed = query.trim();

  if (!trimmed) {
    return EMPTY_PREFILL;
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return { ...EMPTY_PREFILL, email: trimmed.toLowerCase() };
  }

  if (PHONE_PATTERN.test(trimmed)) {
    return { ...EMPTY_PREFILL, phone: trimmed.replace(/[\s().-]/g, "") };
  }

  const [firstName = "", ...rest] = trimmed.split(/\s+/);

  return { ...EMPTY_PREFILL, firstName, lastName: rest.join(" ") };
}
