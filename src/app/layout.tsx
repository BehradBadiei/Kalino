import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "کالینو | ثبت سادهٔ غذا و کالری",
  description: "کالینو؛ یک همراه ساده و شخصی برای ثبت غذا، پیگیری کالری و دیدن پیشرفت روزانه. بدون نیاز به حساب کاربری.",
  applicationName: "کالینو",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/kalino-icon.svg", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "کالینو", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121012",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
