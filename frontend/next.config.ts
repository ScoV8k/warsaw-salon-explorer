import type { NextConfig } from "next";

// The browser always calls same-origin /api/*; Next.js (on Vercel: its edge proxy)
// forwards those requests to the FastAPI backend. No CORS, no mixed content, and
// the immutable photo responses can be cached by the CDN.
const apiTarget = (process.env.API_PROXY_TARGET || "http://localhost:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
