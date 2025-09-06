import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./Components/UI/Toast/Toast";
import AutoProgress from "./Providers/AutoProgress/AutoProgress";
import { Suspense } from "react";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "700"], // add weights as needed
});

export const metadata: Metadata = {
  title: "Apartment Living Locators Portal",
  description: "Apartment Living Locators Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable}`}>
        <Suspense fallback={null}>
          <AutoProgress>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AutoProgress>
        </Suspense>
      </body>
    </html>
  );
}