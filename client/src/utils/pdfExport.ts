import jsPDF from 'jspdf';
import type { Building } from '../api/buildings';

const NOTO_SANS_REGULAR_URL = new URL(
	'./fonts/Noto_Sans/static/NotoSans-Regular.ttf',
	import.meta.url
).toString();
const NOTO_SANS_BOLD_URL = new URL(
	'./fonts/Noto_Sans/static/NotoSans-Bold.ttf',
	import.meta.url
).toString();

let cachedFontData: { regular: string; bold: string } | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	let binary = '';

	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}

	return btoa(binary);
};

const loadFonts = async () => {
	if (cachedFontData) return cachedFontData;

	const [regularResponse, boldResponse] = await Promise.all([
		fetch(NOTO_SANS_REGULAR_URL),
		fetch(NOTO_SANS_BOLD_URL),
	]);

	if (!regularResponse.ok || !boldResponse.ok) {
		throw new Error('Failed to load PDF fonts');
	}

	const [regularBuffer, boldBuffer] = await Promise.all([
		regularResponse.arrayBuffer(),
		boldResponse.arrayBuffer(),
	]);

	cachedFontData = {
		regular: arrayBufferToBase64(regularBuffer),
		bold: arrayBufferToBase64(boldBuffer),
	};

	return cachedFontData;
};

export const handleExportPdf = async (
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
		const doc = new jsPDF();
		doc.setCharSpace(0);

		let fontFamily = 'helvetica';
		try {
			const fontData = await loadFonts();
			doc.addFileToVFS('NotoSans-Regular.ttf', fontData.regular);
			doc.addFileToVFS('NotoSans-Bold.ttf', fontData.bold);
			doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
			doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
			fontFamily = 'NotoSans';
		} catch (fontError) {
			console.warn('PDF font loading failed, using fallback fonts.', fontError);
		}
		const pageWidth = doc.internal.pageSize.getWidth();
		const margin = 20;
		const maxWidth = pageWidth - 2 * margin;
		let yPosition = 20;
		const lineHeight = 7;

		// Title
		doc.setFontSize(18);
		doc.setFont(fontFamily, 'bold');
		const title = building.menoBudovy || 'Nepomenovaná budova';
		doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 15;

		// Content
		doc.setFontSize(10);
		doc.setFont(fontFamily, 'normal');

		Object.entries(building).forEach(([key, value]) => {
			if (value === null || value === undefined || value === '') return;
			if (restrictedFields.has(key)) return;

			const label = fieldLabels[key] || key;
			const text = `${label}: ${value}`;

			// Split text if too long
			const lines = doc.splitTextToSize(text, maxWidth);

			// Check if we need a new page
			if (
				yPosition + lines.length * lineHeight >
				doc.internal.pageSize.getHeight() - 20
			) {
				doc.addPage();
				yPosition = 20;
			}

			doc.setFont(fontFamily, 'bold');
			doc.text(`${label}:`, margin, yPosition);
			doc.setFont(fontFamily, 'normal');

			const valueLines = doc.splitTextToSize(String(value), maxWidth - 5);
			yPosition += lineHeight;

			valueLines.forEach((line: string) => {
				if (yPosition > doc.internal.pageSize.getHeight() - 20) {
					doc.addPage();
					yPosition = 20;
				}
				doc.text(line, margin + 5, yPosition);
				yPosition += lineHeight;
			});

			yPosition += 3; // Extra space between fields
		});

		doc.save(`${building.menoBudovy || 'budova'}_${building.id}.pdf`);

		toaster.success({
			title: 'PDF súbor bol úspešne stiahnutý',
			closable: true,
		});
	} catch (err) {
		console.error('Failed to export PDF:', err);
		toaster.error({
			title: 'Nepodarilo sa exportovať PDF',
			closable: true,
		});
	}
};
