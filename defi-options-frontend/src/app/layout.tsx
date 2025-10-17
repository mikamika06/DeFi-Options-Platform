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
      <body>
        <UrqlProvider>
          <Web3Provider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 container py-8">{children}</main>
              <Toaster />
            </div>
          </Web3Provider>
        </UrqlProvider>
      </body>
    </html>
  );
}
