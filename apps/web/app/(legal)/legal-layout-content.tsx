import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const LegalLayoutContent = async ({ children }: { children: React.ReactNode }) => {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="dashboard min-h-screen bg-background">{children}</div>
    </NextIntlClientProvider>
  );
};
