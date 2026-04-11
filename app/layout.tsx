import "./globals.css";
import AuthGuard from "@/components/auth-guard";
import { LanguageProvider } from "@/components/language-provider";

export const metadata = {
  title: "RapidOne Manager",
  description: "Inventory, reports and statistics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <LanguageProvider initialLanguage="en">
          <AuthGuard>{children}</AuthGuard>
        </LanguageProvider>
      </body>
    </html>
  );
}