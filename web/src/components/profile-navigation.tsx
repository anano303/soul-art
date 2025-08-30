"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  ShoppingBag, 
  Wallet, 
  Smartphone
} from "lucide-react";

const profileNavItems = [
  {
    key: 'profile',
    href: '/profile',
    icon: User,
    labelKey: 'profileNav.profile'
  },
  {
    key: 'orders',
    href: '/profile/orders',
    icon: ShoppingBag,
    labelKey: 'profileNav.orders'
  },
  {
    key: 'balance',
    href: '/profile/balance',
    icon: Wallet,
    labelKey: 'profileNav.balance',
    requiresRole: 'SELLER'
  },
  {
    key: 'devices',
    href: '/profile/devices',
    icon: Smartphone,
    labelKey: 'profileNav.devices'
  }
];

export function ProfileNavigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredNavItems = profileNavItems.filter(item => 
    !item.requiresRole || user?.role === item.requiresRole
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-fit sticky top-16 z-[1000] lg:block hidden">
      <nav className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          {t('profileNav.title') || 'Profile'}
        </h2>
        <div className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

export function MobileProfileNavigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredNavItems = profileNavItems.filter(item => 
    !item.requiresRole || user?.role === item.requiresRole
  );

  return (
    <div className="lg:hidden mb-6 sticky top-16 z-[1000]">
      <div className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
