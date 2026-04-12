import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "ANZEN AIへのご意見・ご要望・ご質問はこちらからお送りください。",
  openGraph: {
    title: "お問い合わせ｜ANZEN AI",
    description: "ANZEN AIへのご意見・ご要望・ご質問はこちらからお送りください。",
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
