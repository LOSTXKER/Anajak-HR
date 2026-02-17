import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationInitializer } from "@/components/NotificationInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SWRProvider } from "@/components/SWRProvider";

export const metadata: Metadata = {
  title: "Anajak HR - ระบบบันทึกเข้างาน OT",
  description: "ระบบบันทึกเวลาเข้างาน-เลิกงาน และจัดการ OT ผ่านมือถือ",
  applicationName: "Anajak HR",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anajak HR",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128x128.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SWRProvider>
            <ToastProvider>
              <ErrorBoundary>
                <NotificationInitializer />
                {children}
              </ErrorBoundary>
            </ToastProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
