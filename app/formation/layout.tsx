import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Formation grid"
};

export default function FormationLayout({ children }: { children: ReactNode }) {
  return children;
}
