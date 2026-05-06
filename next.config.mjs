const r2PublicUrl = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      ...(r2PublicUrl ? [{ protocol: r2PublicUrl.protocol.replace(":", ""), hostname: r2PublicUrl.hostname }] : [])
    ]
  }
};

export default nextConfig;
