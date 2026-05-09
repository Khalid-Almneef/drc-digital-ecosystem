import { Navigation } from "@/components/ui/Navigation";
import { Footer } from "@/components/ui/Footer";
import { GlowEffect } from "@/components/ui/GlowEffect";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-x-hidden min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:start-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-background focus:font-semibold focus:text-sm"
      >
        Skip to content
      </a>
      <div className="public-site-bg" />
      <GlowEffect className="z-0" />
      <Navigation />
      <main id="main-content" className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
