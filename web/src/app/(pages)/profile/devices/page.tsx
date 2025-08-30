import DeviceManager from "@/components/device-manager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "მოწყობილობების მართვა | Soulart - Device Management | Soulart",
  description:
    "მართეთ თქვენი სანდო მოწყობილობები და გაუმჯობესებული უსაფრთხოების პარამეტრები. Manage your trusted devices and enhanced security settings.",
  keywords: [
    "მოწყობილობების მართვა",
    "სანდო მოწყობილობები",
    "უსაფრთხოება",
    "სესია",
    "ავტორიზაცია",
    "device management",
    "trusted devices", 
    "security",
    "session management",
    "authentication",
    "Soulart security",
  ],
  robots: {
    index: false, // Private profile page
    follow: false,
  },
};

export default function DevicesPage() {
  return <DeviceManager />;
}
