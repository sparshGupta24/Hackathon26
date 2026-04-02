import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showdown slot"
};

export default function ShowdownSlotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
