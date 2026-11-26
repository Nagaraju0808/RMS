

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

/** @type {import("next").NextConfig} */
const isProd = process.env.NODE_ENV === "production";
// Content Security Policy (production only: the dev server needs eval for hot reload).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://api.razorpay.com https://lumberjack.razorpay.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'",
].join("; ");
if (isProd) securityHeaders.push({ key: "Content-Security-Policy", value: csp }, { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });

const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "exceljs", "@prisma/client", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default nextConfig;
