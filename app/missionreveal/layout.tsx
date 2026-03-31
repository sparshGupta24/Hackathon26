import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mission reveal"
};

export default function MissionRevealLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
