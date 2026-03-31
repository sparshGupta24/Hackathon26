import type { Metadata } from "next";
import { SessionAlertSlide } from "@/components/SessionAlertSlide";

export const metadata: Metadata = {
  title: "Tea Time"
};

export default function TeaPage() {
  return (
    <SessionAlertSlide title="Tea Time" visual="cup" visualAriaLabel="Tea cup" nextHref="/arena2" />
  );
}
