import type { DefaultSession } from "next-auth"

declare module "next-auth" {
	interface Session extends DefaultSession {
		accessToken?: string
		refreshToken?: string
		user?: {
			email?: string
		} & DefaultSession["user"]
	}

	interface User {
		accessToken?: string
		refreshToken?: string
		email?: string
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		accessToken?: string
		refreshToken?: string
		email?: string
		accessTokenExpires?: number
	}
}
