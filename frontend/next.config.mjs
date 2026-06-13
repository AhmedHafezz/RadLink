/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features needed for Cornerstone3D
  experimental: {
    // Needed for proper WASM support
    esmExternals: 'loose',
  },

  // Security headers required for SharedArrayBuffer (Cornerstone3D multi-threading)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack configuration for Cornerstone3D, WASM, and web workers
  webpack: (config, { isServer, webpack }) => {
    // Required for SharedArrayBuffer in browser
    config.output.crossOriginLoading = 'anonymous';

    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Handle web workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          filename: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    // Exclude Cornerstone modules from server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      const cornerstonePackages = [
        '@cornerstonejs/core',
        '@cornerstonejs/tools',
        '@cornerstonejs/dicom-image-loader',
        'dcmjs',
      ];
      if (Array.isArray(config.externals)) {
        config.externals.push(...cornerstonePackages);
      }
    }

    // Resolve fallbacks for browser-only APIs
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        assert: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Ignore node-specific modules in client bundle
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(canvas|jsdom)$/,
      })
    );

    // Handle binary files used by DICOM parsers
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: 'raw-loader',
    });

    return config;
  },

  // Image optimization config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Transpile Cornerstone packages (they ship ESM)
  transpilePackages: [
    '@cornerstonejs/core',
    '@cornerstonejs/tools',
    '@cornerstonejs/dicom-image-loader',
  ],

  // Environment variable validation at build time
  env: {
    NEXT_PUBLIC_APP_NAME: 'RadLink',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
};

export default nextConfig;
