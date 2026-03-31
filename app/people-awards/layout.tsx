import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "People awards"
};

export default function PeopleAwardsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
