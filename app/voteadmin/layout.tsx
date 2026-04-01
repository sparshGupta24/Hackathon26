import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vote admin"
};

export default function VoteAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
