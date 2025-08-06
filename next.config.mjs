/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress hydration warnings caused by browser extensions
  reactStrictMode: true,
  
  // Configure webpack to ignore certain warnings
  webpack: (config, { dev, isServer }) => {
    // Suppress hydration warnings in development
    if (dev && !isServer) {
      config.module.rules.push({
        test: /\.js$/,
        include: [/node_modules/],
        use: {
          loader: 'string-replace-loader',
          options: {
            search: 'process.env.NODE_ENV !== "production"',
            replace: 'false',
            flags: 'g'
          }
        }
      });
    }
    return config;
  },
  
  // Experimental features
  experimental: {
    // Suppress hydration warnings
    suppressHydrationWarning: true
  }
};

export default nextConfig;
