import type { NextConfig } from "next";

// Content-Security-Policy. We currently rely on Next.js's inline theme-
// bootstrap script in src/app/layout.tsx, which forces 'unsafe-inline' on
// script-src for now. Tightening to a nonce / 'strict-dynamic' setup is a
// follow-up; this baseline still blocks third-party script injection and
// frames, and pairs with M-05 (SVG upload block) to bound stored-XSS blast
// radius.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://drive.google.com https://*.googleusercontent.com https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.public.blob.vercel-storage.com https://api.resend.com",
  // frame-src must explicitly list every host we embed; without it
  // default-src would block all third-party iframes (Drive /preview,
  // YouTube embeds, etc.) and the browser shows a generic "blocked"
  // message inside the iframe.
  "frame-src 'self' https://drive.google.com https://docs.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Vercel Blob (uploaded photos / files)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Common avatar / external content hosts used by the team
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "drive.google.com" },
      // Local dev
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
