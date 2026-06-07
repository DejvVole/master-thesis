import { createAuthClient } from 'better-auth/react';
import { adminClient, magicLinkClient } from 'better-auth/client/plugins';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
	baseURL: `${API_URL}/api/auth`,
	plugins: [adminClient(), magicLinkClient()],
	fetchOptions: {
		credentials: 'include',
	},
});

export const { signIn, signOut, useSession, getSession } = authClient;
export const { admin, magicLink } = authClient;
