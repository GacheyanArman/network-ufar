import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "UFAR Student Network",
  description: "Social platform for UFAR students",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}