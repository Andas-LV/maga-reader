import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Папка Просмотр",
    short_name: "Читалка",
    description: "Просмотр файлов из локальных папок — работает офлайн",
    start_url: "/viewer",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any" as any,
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any maskable" as any,
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any maskable" as any,
      },
    ],
  };
}
