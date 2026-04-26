import { createAuthClient } from 'better-auth/react';
import { adminClient, magicLinkClient } from 'better-auth/client/plugins';

// API URL pre auth endpointy
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
	baseURL: `${API_URL}/api/auth`,
	plugins: [adminClient(), magicLinkClient()],
	fetchOptions: {
		credentials: 'include', // Dôležité pre posielanie cookies cross-origin
	},
});

// Export jednotlivých hooks a funkcií pre pohodlné používanie
export const { signIn, signOut, useSession, getSession } = authClient;

// Admin funkcie
export const { admin, magicLink } = authClient;
