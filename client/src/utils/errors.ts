import axios from 'axios';

export function getErrorMessage(
	error: unknown,
	fallback = 'Niečo sa pokazilo'
): string {
	if (axios.isAxiosError(error)) {
		const data = error.response?.data as
			| { error?: unknown; message?: unknown }
			| undefined;
		if (typeof data?.error === 'string') return data.error;
		if (typeof data?.message === 'string') return data.message;
		if (error.message) return error.message;
	}
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === 'string') return error;
	return fallback;
}
