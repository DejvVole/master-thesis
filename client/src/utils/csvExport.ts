import type { Building } from '../api/buildings';

export const handleExportCsv = (
	building: Building,
	fieldLabels: Record<string, string>,
	toaster: any
) => {
	const restrictedFields = new Set([
		'id',
		'sourceDocumentId',
		'createdAt',
		'updatedAt',
		'isHidden',
		'rokVystavbyNormalized',
	]);

	try {
		const mapping: { key: string[]; values: string[] } = {
			key: [],
			values: [],
		};

		Object.entries(building).forEach(([key, value]) => {
			if (value === null || value === undefined || value === '') return;
			if (restrictedFields.has(key)) return;

			mapping.key.push(fieldLabels[key] || key);
			mapping.values.push(value);
		});
		const headers = mapping.key.join(';');
		const values = mapping.values
			.map((value) => {
				if (value === null || value === undefined) return '';
				const stringValue = String(value);
				if (
					stringValue.includes(';') ||
					stringValue.includes('"') ||
					stringValue.includes('\n')
				) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return stringValue;
			})
			.join(';');

		const csvContent = '\uFEFF' + headers + '\n' + values; // BOM for UTF-8
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `${building.menoBudovy || 'budova'}_${building.id}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toaster.success({
			title: 'CSV súbor bol úspešne stiahnutý',
			closable: true,
		});
	} catch (err) {
		console.error('Failed to export CSV:', err);
		toaster.error({
			title: 'Nepodarilo sa exportovať CSV',
			closable: true,
		});
	}
};
