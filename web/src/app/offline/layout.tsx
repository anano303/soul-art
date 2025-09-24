import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ოფლაინ რეჟიმი - SoulArt | Offline",
  description: "თქვენ ოფლაინ რეჟიმში ხართ. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი.",
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
