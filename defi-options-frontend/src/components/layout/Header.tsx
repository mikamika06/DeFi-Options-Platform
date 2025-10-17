'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function Header() {
  const navItems = [
    { href: '/trade', label: 'Торгівля' },
    { href: '/pools', label: 'Пули Ліквідності' },
    { href: '/positions', label: 'Мої Позиції' },
    { href: '/risk', label: 'Ризик & Аналітика' },
    { href: '/admin', label: 'Admin (DAO)', isAdmin: true },
  ];

  const hasRainbowKit = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur bg-background/80">
      <div className="container flex h-16 items-center justify-between py-4">
        <nav className="flex items-center space-x-2 lg:space-x-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-primary">
            DeFi Options AMM
          </Link>
          <Separator orientation="vertical" className="h-6 mx-4" />
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" className="text-sm">
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        {hasRainbowKit ? (
          <ConnectButton label="Підключити Гаманець" chainStatus="icon" />
        ) : (
          <Button
            variant="outline"
            onClick={() => console.warn('WalletConnect не налаштований. Додайте NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.')}
          >
            Підключити гаманець
          </Button>
        )}
      </div>
    </header>
  );
}
