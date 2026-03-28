import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow Mapbox worker
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl',
    }
    return config
  },
  turbopack: {},
}

export default nextConfig
