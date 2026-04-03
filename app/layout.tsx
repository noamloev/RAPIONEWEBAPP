import "./globals.css";
import AuthGuard from "@/components/auth-guard";

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
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}