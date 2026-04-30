import axios from 'axios';
import type {
	BuildingFilters,
	FilterOptions,
} from '../pages/filters/Filters.helper';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
	throw new Error('VITE_API_URL is not defined in environment variables');
}

export interface Building {
	id: number;
	menoBudovy: string | null;
	adresa: string | null;
	gpsSuradnice: string | null;
	rokVystavby: string | null;
	aktualnyVlastnik: string | null;
	rokZaradenia: string | null;
	historickyVyznam: string | null;
	zaznamyOObnove: string | null;
	materialVonkajsejFasady: string | null;
	typStrechy: string | null;
	materialInterieru: string | null;
	ineMaterialy: string | null;
	aktualnyStav: string | null;
	kritickeMiesta: string | null;
	potrebneSanacie: string | null;
	sucasneFotografie: string | null;
	historickeFotografie: string | null;
	planyASchemy: string | null;
	harmonogramUdrzby: string | null;
	revizneZaznamy: string | null;
	ochranneZony: string | null;
	povoleniaNaZasahy: string | null;
	legislativneObmedzenia: string | null;
	digitalneVykresy: string | null;
	archeologickeVyskumy: string | null;
	chemickeAnalyzy: string | null;
	sourceDocumentId: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface SourceDocument {
	id: number;
	fileName: string;
	filePath: string; // MinIO object name
	metadata: any;
	processedDate: string;
}

export interface UploadProgress {
	status: 'pending' | 'processing' | 'complete' | 'error';
	progress: number;
	message: string;
	detail?: string;
	stage?: string;
	currentCategory?: number;
	totalCategories?: number;
	error?: string;
	result?: any;
}

export interface UploadResponse {
	success: boolean;
	sessionId: string;
	message: string;
	fileName: string;
}

const isAbbreviationToken = (token: string): boolean => {
	const trimmed = token.trim();
	if (!trimmed) return false;

	const dotCount = (trimmed.match(/\./g) || []).length;
	if (dotCount >= 2) return true;
	if (/^(?:[\p{L}]\.){2,}$/u.test(trimmed)) return true;

	const cleaned = trimmed.replace(/[.,;:]+$/u, '');
	if (!cleaned) return false;
	if (/^\p{L}+$/u.test(cleaned) && cleaned === cleaned.toUpperCase())
		return cleaned.length <= 3;
	if (/^\p{L}+$/u.test(cleaned) && cleaned.length <= 3) return true;

	return false;
};

const capitalizeFirstAlpha = (text: string): string => {
	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (/\p{L}/u.test(char)) {
			return text.slice(0, i) + char.toUpperCase() + text.slice(i + 1);
		}
	}
	return text;
};

const normalizeAllCaps = (text: string): string => {
	const hasLetter = /\p{L}/u.test(text);
	const hasLower = /\p{Ll}/u.test(text);
	if (!hasLetter || hasLower) return text;

	const tokens = text.split(/\s+/);
	const hasNonAbbrevToken = tokens.some((token) => !isAbbreviationToken(token));
	if (!hasNonAbbrevToken) return text;

	return text.toLowerCase();
};

export function formatTrailingDots(value: string | null): string | null {
	if (value === null) return value;

	const trimmed = value.trimEnd();
	if (!trimmed.endsWith('.')) return value;

	const tokens = trimmed.split(/\s+/);
	const lastToken = tokens[tokens.length - 1] || '';
	if (!isAbbreviationToken(lastToken)) {
		return trimmed.replace(/\.+$/u, '');
	}

	return value;
}

export function formatBuildingName(value: string | null): string {
	if (!value) return '';

	let name = value.trim();
	if (!name) return '';

	name = normalizeAllCaps(name);
	name = capitalizeFirstAlpha(name);

	const tokens = name.split(/\s+/);
	const lastToken = tokens[tokens.length - 1] || '';

	if (name.endsWith('.')) {
		if (!isAbbreviationToken(lastToken)) {
			name = name.replace(/\.+$/u, '');
		}
	} else if (isAbbreviationToken(lastToken)) {
		name = `${name}.`;
	}

	return name;
}

function stripTrailingDots(building: Building): Building {
	const result = { ...building };
	for (const key of Object.keys(result) as (keyof Building)[]) {
		const value = result[key];
		if (
			typeof value === 'string' &&
			key !== 'createdAt' &&
			key !== 'updatedAt'
		) {
			if (key === 'menoBudovy') {
				(result as any)[key] = formatBuildingName(value);
				continue;
			}

			(result as any)[key] = formatTrailingDots(value);
		}
	}
	return result;
}

export const buildingsApi = {
	getFiltered: async (filters: BuildingFilters): Promise<Building[]> => {
		const params = new URLSearchParams();

		if (filters.rokVystavbyOd)
			params.append('rokVystavbyOd', filters.rokVystavbyOd);
		if (filters.rokVystavbyDo)
			params.append('rokVystavbyDo', filters.rokVystavbyDo);
		if (filters.typStrechy) params.append('typStrechy', filters.typStrechy);
		if (filters.materialFasady)
			params.append('materialFasady', filters.materialFasady);
		if (filters.materialInterieru)
			params.append('materialInterieru', filters.materialInterieru);
		if (filters.aktualnyStav)
			params.append('aktualnyStav', filters.aktualnyStav);
		if (filters.obdobie) params.append('obdobie', filters.obdobie);

		const response = await axios.get(
			`${API_URL}/api/buildings/filter?${params.toString()}`
		);
		return (response.data as Building[]).map(stripTrailingDots);
	},

	getFilterOptions: async (): Promise<FilterOptions> => {
		const response = await axios.get(`${API_URL}/api/buildings/filter-options`);
		return response.data;
	},
	searchSemantic: async (query: string): Promise<Building[]> => {
		const response = await axios.post(`${API_URL}/api/buildings/search`, {
			query: query.trim(),
		});
		return (response.data as Building[]).map(stripTrailingDots);
	},

	getAll: async (): Promise<Building[]> => {
		const response = await axios.get(`${API_URL}/api/buildings`);
		return (response.data as Building[]).map(stripTrailingDots);
	},

	getById: async (id: number): Promise<Building> => {
		const response = await axios.get(`${API_URL}/api/buildings/${id}`);
		return stripTrailingDots(response.data);
	},

	getSourceDocument: async (buildingId: number): Promise<SourceDocument> => {
		const response = await axios.get(
			`${API_URL}/api/buildings/${buildingId}/document`
		);
		return response.data;
	},

	getPdfUrl: async (buildingId: number): Promise<string> => {
		const response = await axios.get(
			`${API_URL}/api/buildings/${buildingId}/pdf-url`
		);
		return response.data.url;
	},

	uploadDocument: async (
		file: File,
		enableInference: boolean = false
	): Promise<any> => {
		const formData = new FormData();
		formData.append('pdf', file);
		formData.append('enableInference', String(enableInference));

		const response = await axios.post(
			`${API_URL}/api/buildings/upload`,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				timeout: 300000,
			}
		);

		return response.data;
	},

	cancelUpload: async (sessionId: string): Promise<void> => {
		await axios.delete(`${API_URL}/api/buildings/upload/${sessionId}`);
	},

	subscribeToProgress: (
		sessionId: string,
		onProgress: (data: UploadProgress) => void,
		onError: (error: Error) => void
	): (() => void) => {
		const eventSource = new EventSource(
			`${API_URL}/api/buildings/upload/progress/${sessionId}`,
			{ withCredentials: true }
		);

		eventSource.onmessage = (event) => {
			try {
				const data: UploadProgress = JSON.parse(event.data);
				onProgress(data);

				if (data.status === 'complete' || data.status === 'error') {
					eventSource.close();
				}
			} catch (e) {
				console.error('Failed to parse progress data:', e);
			}
		};

		eventSource.onerror = (error) => {
			console.error('SSE Error:', error);
			onError(new Error('Connection lost'));
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	},
};
