/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  agentRules: false,
  // Client components format amounts too, so the currency code has to reach the bundle.
  env: {
    CURRENCY: process.env.CURRENCY ?? 'RWF',
  },
};

export default nextConfig;
