const getEnabledSubmitter = (
  form: HTMLFormElement,
): HTMLButtonElement | HTMLInputElement | null => {
  const submitter = form.querySelector(
    'button[type="submit"]:not(:disabled), button:not([type]):not(:disabled), input[type="submit"]:not(:disabled)',
  );

  return submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
    ? submitter
    : null;
};

const getActiveShortcutForm = (): HTMLFormElement | null => {
  const activeElement = document.activeElement;
  const focusedForm =
    activeElement instanceof HTMLElement
      ? activeElement.closest<HTMLFormElement>("form[data-keyboard-shortcut-submit]")
      : null;

  if (focusedForm && getEnabledSubmitter(focusedForm)) {
    return focusedForm;
  }

  const eligibleForms = Array.from(
    document.querySelectorAll<HTMLFormElement>("form[data-keyboard-shortcut-submit]"),
  ).filter((form) => getEnabledSubmitter(form));

  return eligibleForms.length === 1 ? (eligibleForms[0] ?? null) : null;
};

export const submitActiveKeyboardShortcutForm = (): boolean => {
  const activeElement = document.activeElement;
  const focusedSaveButton =
    activeElement instanceof HTMLElement
      ? activeElement
          .closest<HTMLFormElement>("form")
          ?.querySelector<HTMLButtonElement>("[data-keyboard-shortcut-save]:not(:disabled)")
      : null;
  const saveButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-keyboard-shortcut-save]:not(:disabled)"),
  );
  const saveButton = focusedSaveButton ?? (saveButtons.length === 1 ? saveButtons[0] : null);

  if (saveButton) {
    saveButton.click();
    return true;
  }

  const form = getActiveShortcutForm();
  if (!form) {
    return false;
  }

  const submitter = getEnabledSubmitter(form);
  if (!submitter) {
    return false;
  }

  form.requestSubmit(submitter);
  return true;
};
