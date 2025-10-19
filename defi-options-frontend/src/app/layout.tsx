import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css"; 
import { Web3Provider } from "./providers/Web3Provider";
import { UrqlProvider } from "./providers/UrqlProvider";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner"; 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="font-sans antialiased text-foreground">
        <UrqlProvider>
          <Web3Provider>
            <div className="relative flex min-h-screen flex-col">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_rgba(255,255,255,0)_55%),radial-gradient(circle_at_bottom_right,_rgba(226,232,240,0.6),_rgba(255,255,255,0)_55%)]"
              />
              <Header />
              <main className="flex-1">
                <div className="mx-auto w-full max-w-7xl px-6 py-12">{children}</div>
              </main>
              <Toaster />
            </div>
          </Web3Provider>
        </UrqlProvider>
      </body>
    </html>
  );
}
