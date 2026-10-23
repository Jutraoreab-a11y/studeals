import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studeals",
    short_name: "Studeals",
    description: "Seconde main, coloc et coups de main entre 18-25 ans.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4fb",
    theme_color: "#1a1b4b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
