import axios from 'axios';
import { formatBuildingName, formatTrailingDots } from './buildings';

const API_URL = import.meta.env.VITE_API_URL;

export interface AdminDocument {
	id: number;
	fileName: string;
	filePath: string | null;
	metadata: any;
	processedDate: string | null;
	createdAt: string;
	isHidden: boolean;
	inferenceEnabled: boolean;
	extractedCount: number;
	inferredCount: number;
	missingCount: number;
	building: {
		id: number;
		menoBudovy: string | null;
		isHidden: boolean;
	} | null;
}

export interface AdminStats {
	totalDocuments: number;
	hiddenDocuments: number;
	visibleDocuments: number;
	totalBuildings: number;
	hiddenBuildings: number;
	inferenceEnabled: number;
	inferenceDisabled: number;
}

export interface CategorySource {
	id: number;
	fieldName: string; // camelCase - e.g. "menoBudovy"
	fieldNameSnake: string; // snake_case - e.g. "meno_budovy" (for reference)
	label: string; // Slovak display label - e.g. "Meno budovy"
	sourceType: 'EXTRACTED' | 'INFERRED' | 'MISSING' | 'EDITED';
	confidence: string | null;
	reasoning: string | null;
	value: string | null;
	originalSourceType?: 'EXTRACTED' | 'INFERRED' | 'MISSING'; // Original type before editing
}

export interface Invitation {
	id: string;
	email: string;
	role: 'user' | 'admin';
	expiresAt: string;
	acceptedAt: string | null;
	createdAt: string;
}

export const adminApi = {
	getDocuments: async (): Promise<AdminDocument[]> => {
		const response = await axios.get(`${API_URL}/api/admin/documents`);
		return (response.data as AdminDocument[]).map((doc) => {
			if (!doc.building) return doc;
			return {
				...doc,
				building: {
					...doc.building,
					menoBudovy: formatBuildingName(doc.building.menoBudovy),
				},
			};
		});
	},

	toggleVisibility: async (
		documentId: number
	): Promise<{ isHidden: boolean }> => {
		const response = await axios.patch(
			`${API_URL}/api/admin/documents/${documentId}/toggle-visibility`
		);
		return response.data;
	},

	deleteDocument: async (documentId: number): Promise<void> => {
		await axios.delete(`${API_URL}/api/admin/documents/${documentId}`);
	},

	getStats: async (): Promise<AdminStats> => {
		const response = await axios.get(`${API_URL}/api/admin/stats`);
		return response.data;
	},

	getBuildingSources: async (buildingId: number): Promise<CategorySource[]> => {
		const response = await axios.get(
			`${API_URL}/api/admin/buildings/${buildingId}/sources`
		);
		return (response.data as CategorySource[]).map((source) => ({
			...source,
			value: formatTrailingDots(source.value),
		}));
	},

	sendInvitation: async (
		email: string,
		role: 'user' | 'admin' = 'user'
	): Promise<{ success: boolean; message: string }> => {
		const response = await axios.post(`${API_URL}/api/invitation`, {
			email,
			role,
		});
		return response.data;
	},

	getInvitations: async (): Promise<Invitation[]> => {
		const response = await axios.get(`${API_URL}/api/invitation/list`);
		return response.data;
	},

	deleteInvitation: async (id: string): Promise<void> => {
		await axios.delete(`${API_URL}/api/invitation/${id}`);
	},

	updateSourceValue: async (
		buildingId: number,
		sourceId: number,
		fieldName: string,
		newValue: string
	): Promise<CategorySource> => {
		const response = await axios.patch(
			`${API_URL}/api/admin/buildings/${buildingId}/sources/${sourceId}`,
			{ fieldName, newValue }
		);
		return {
			...(response.data as CategorySource),
			value: formatTrailingDots(response.data.value),
		};
	},
};

// Verejné API pre pozvánky (bez auth)
export const invitationApi = {
	verify: async (
		token: string
	): Promise<{ valid: boolean; email?: string; error?: string }> => {
		try {
			const response = await axios.get(
				`${API_URL}/api/invitation/verify/${token}`
			);
			return response.data;
		} catch (error: any) {
			return {
				valid: false,
				error: error.response?.data?.error || 'Nepodarilo sa overiť pozvánku',
			};
		}
	},

	accept: async (
		token: string,
		name: string,
		password: string
	): Promise<{ success: boolean; message?: string; error?: string }> => {
		try {
			const response = await axios.post(`${API_URL}/api/invitation/accept`, {
				token,
				name,
				password,
			});
			return response.data;
		} catch (error: any) {
			return {
				success: false,
				error: error.response?.data?.error || 'Nepodarilo sa vytvoriť účet',
			};
		}
	},
};
