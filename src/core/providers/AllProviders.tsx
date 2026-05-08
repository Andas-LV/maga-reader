"use client";
// import { SessionProvider } from "next-auth/react";
import React from "react";
import { ThemeProvider } from "./ThemeProvider";

export function AllProviders({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ThemeProvider>
			{children}
		</ThemeProvider>
	);
}
