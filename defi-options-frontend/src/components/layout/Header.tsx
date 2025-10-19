'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function Header() {
    const navItems = [
        { href: '/trade', label: 'Trading' },
        { href: '/pools', label: 'Liquidity Pools' },
        { href: '/positions', label: 'My Positions' },
        { href: '/risk', label: 'Risk & Analytics' },
        { href: '/admin', label: 'Admin (DAO)', isAdmin: true },
    ];

    const hasRainbowKit = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/85 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
                <nav className="flex items-center gap-2 lg:gap-6">
                    <Link href="/" className="text-xl font-extrabold tracking-tight text-primary">
                        DeFi Options AMM
                    </Link>
                    <Separator orientation="vertical" className="mx-3 hidden h-6 lg:block" />
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant="ghost"
                                className="rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </nav>
                {hasRainbowKit ? (
                    <ConnectButton label="Connect Wallet" chainStatus="icon" />
                ) : (
                    <Button
                        variant="outline"
                        className="rounded-full border-border/80 bg-white/90 text-sm font-medium shadow-sm transition-colors hover:border-border hover:bg-white"
                        onClick={() => console.warn('WalletConnect is not configured. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.')}
                    >
                        Connect wallet
                    </Button>
                )}
            </div>
        </header>
    );
}
