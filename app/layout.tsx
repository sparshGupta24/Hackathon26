import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/app/globals.css";

const headingFont = localFont({
  src: "../public/F1-Font-Family/Formula1-Wide.ttf",
  variable: "--font-heading",
  display: "swap"
});

const bodyFont = localFont({
  src: [
    {
      path: "../public/F1-Font-Family/Formula1-Regular-1.ttf",
      weight: "400",
      style: "normal"
    },
    {
      path: "../public/F1-Font-Family/Formula1-Bold-4.ttf",
      weight: "700",
      style: "normal"
    },
    {
      path: "../public/F1-Font-Family/Formula1-Italic.ttf",
      weight: "400",
      style: "italic"
    }
  ],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "F1 Team Onboarding Arena",
  description: "Volunteer-controlled game registration and timer dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
