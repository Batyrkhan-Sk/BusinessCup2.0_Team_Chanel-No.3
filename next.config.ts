import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The DEMO denial letter is read from disk by these routes; make sure it ships with them.
  outputFileTracingIncludes: {
    "/api/decode": ["./fixtures/demo-denial-letter.pdf"],
    "/api/demo-letter": ["./fixtures/demo-denial-letter.pdf"],
  },
};

export default nextConfig;
