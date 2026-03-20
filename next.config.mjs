/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  // Handle external dependencies properly
  experimental: {
    serverComponentsExternalPackages: [
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
      '@aws-sdk/client-ses'
    ],
  },
  // Suppress Leaflet SSR warnings and handle AWS SDK
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      dns: false,
      tls: false,
      assert: false,
      path: false,
      zlib: false,
      querystring: false,
      url: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      os: false,
      util: false
    };

    // More aggressive AWS SDK externalization
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        // Externalize all AWS SDK packages
        ({ request }, callback) => {
          if (request?.startsWith('@aws-sdk/')) {
            return callback(null, `commonjs ${request}`);
          }
          if (request?.startsWith('@smithy/')) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      );
    } else {
      // Client-side: completely ignore AWS SDK
      config.resolve.alias = {
        ...config.resolve.alias,
        '@aws-sdk/client-s3': false,
        '@aws-sdk/s3-request-presigner': false,
        '@aws-sdk/client-ses': false,
      };
    }

    return config;
  },
};

export default nextConfig;
