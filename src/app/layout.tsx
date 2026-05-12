import type { Metadata } from "next";
import { manrope } from "@/core/assets/fonts";
import "../core/styles/globals.css";
import React, { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import Loading from "@/shared/components/Loading/Loading";
import { AllProviders } from "@/core/providers/AllProviders";

export const metadata: Metadata = {
	title: "Папка Просмотр",
	description: "Просмотр файлов из локальных папок — работает офлайн",
	generator: "Next.js",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Читалка",
	},
	other: {
		"mobile-web-app-capable": "yes",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="apple-touch-icon" href="/icon-192.png" />
				<meta name="theme-color" content="#09090b" />
			</head>
			<body className={`${manrope.className}`}>
				<Suspense fallback={<Loading />}>
					<AllProviders>{children}</AllProviders>
				</Suspense>
				<Analytics />
			</body>
		</html>
	);
}
