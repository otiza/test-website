import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Country Atlas Dashboard",
  description: "Explore countries by population, GDP, and more."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
