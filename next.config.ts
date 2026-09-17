import type { NextConfig } from "next";

// NOTE: no Content-Security-Policy header is emitted on purpose. The app uses
// Next.js App Router which injects inline bootstrapping scripts; a strict CSP
// would break it and a lax one would be misleading. If a CSP is ever required,
// it must be added with a nonce strategy alongside the first migration to
// inline-free output. DOCUMENTED_IN_NEXT_CONFIG.

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), battery=(), usb=()",
  },
  // Camera is used within this origin only (no cross-origin iframes).
  // HTTPS-only directive; harmless (and inert) on plain-HTTP localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
