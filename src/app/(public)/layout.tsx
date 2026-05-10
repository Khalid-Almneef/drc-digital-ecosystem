import { Navigation } from "@/components/ui/Navigation";
import { Footer } from "@/components/ui/Footer";
import { GlowEffect } from "@/components/ui/GlowEffect";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:start-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-background focus:font-semibold focus:text-sm"
      >
        Skip to content
      </a>
      <div className="pointer-events-none fixed left-1/3 top-0 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-[120px]" />
      <div className="pointer-events-none fixed right-0 top-24 h-[300px] w-[380px] rounded-full bg-gradient-to-bl from-secondary/12 to-transparent blur-[110px]" />
      <GlowEffect className="z-0" />
      <Navigation />
      <main id="main-content" className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
