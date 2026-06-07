import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { buildingsApi, type Building } from '../../api/buildings';
import { Box } from '@chakra-ui/react';
import BuildingFooter from './BuildingFooter';
import BackLink from '../../components/BackLink';
import BuildingContent from './BuildingContent';
import BuildingHeader from './BuildingHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toaster } from '../../components/ui/toaster';
import { handleExportCsv } from '../../utils/csvExport';
import { handleExportPdf } from '../../utils/pdfExport';
const buildingFields: {
	key: keyof Building;
	label: string;
	category: string;
}[] = [
	{ key: 'adresa', label: 'Adresa', category: 'základné' },
	{ key: 'gpsSuradnice', label: 'GPS súradnice', category: 'základné' },
	{ key: 'rokVystavby', label: 'Rok výstavby', category: 'základné' },
	{ key: 'aktualnyVlastnik', label: 'Aktuálny vlastník', category: 'základné' },
	{ key: 'rokZaradenia', label: 'Rok zaradenia', category: 'základné' },

	{ key: 'historickyVyznam', label: 'Historický význam', category: 'história' },
	{ key: 'zaznamyOObnove', label: 'Záznamy o obnove', category: 'história' },

	{
		key: 'materialVonkajsejFasady',
		label: 'Materiál vonkajšej fasády',
		category: 'materiály',
	},
	{ key: 'typStrechy', label: 'Typ strechy', category: 'materiály' },
	{
		key: 'materialInterieru',
		label: 'Materiál interiéru',
		category: 'materiály',
	},
	{ key: 'ineMaterialy', label: 'Iné materiály', category: 'materiály' },

	// Stav budovy
	{ key: 'aktualnyStav', label: 'Aktuálny stav', category: 'stav' },
	{ key: 'kritickeMiesta', label: 'Kritické miesta', category: 'stav' },

	{ key: 'potrebneSanacie', label: 'Potrebné sanácie', category: 'údržba' },
	{ key: 'harmonogramUdrzby', label: 'Harmonogram údržby', category: 'údržba' },
	{ key: 'revizneZaznamy', label: 'Revízne záznamy', category: 'údržba' },

	{
		key: 'sucasneFotografie',
		label: 'Súčasné fotografie',
		category: 'dokumentácia',
	},
	{
		key: 'historickeFotografie',
		label: 'Historické fotografie',
		category: 'dokumentácia',
	},
	{ key: 'planyASchemy', label: 'Plány a schémy', category: 'dokumentácia' },

	{ key: 'ochranneZony', label: 'Ochranné zóny', category: 'legislatíva' },
	{
		key: 'povoleniaNaZasahy',
		label: 'Povolenia na zásahy',
		category: 'legislatíva',
	},
	{
		key: 'legislativneObmedzenia',
		label: 'Legislatívne obmedzenia',
		category: 'legislatíva',
	},

	{
		key: 'digitalneVykresy',
		label: 'Digitálne výkresy',
		category: 'digitálne',
	},

	{
		key: 'archeologickeVyskumy',
		label: 'Archeologické výskumy',
		category: 'výskum',
	},
	{ key: 'chemickeAnalyzy', label: 'Chemické analýzy', category: 'výskum' },
];

const fieldLabels: Record<string, string> = {
	menoBudovy: 'Meno budovy',
	...Object.fromEntries(buildingFields.map((f) => [f.key, f.label])),
};

function groupFieldsByCategory(building: Building) {
	const groups: Record<
		string,
		{ label: string; value: string | null; key: string }[]
	> = {};

	buildingFields.forEach((field) => {
		const value = building[field.key];
		if (value && typeof value === 'string') {
			if (!groups[field.category]) {
				groups[field.category] = [];
			}
			groups[field.category].push({
				label: field.label,
				value: value,
				key: field.key,
			});
		}
	});

	return groups;
}

export default function BuildingDetail() {
	const { id } = useParams<{ id: string }>();
	const [building, setBuilding] = useState<Building | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);

	const handleViewPdf = async () => {
		if (pdfUrl) {
			window.open(pdfUrl, '_blank');
			return;
		}

		try {
			const url = await buildingsApi.getPdfUrl(Number(id));
			setPdfUrl(url);
			window.open(url, '_blank');
		} catch (err) {
			console.error('Failed to load PDF:', err);
			toaster.warning({
				title: 'Nepodarilo sa načítať PDF',
				closable: true,
			});
		}
	};

	useEffect(() => {
		if (id) {
			buildingsApi
				.getById(parseInt(id))
				.then(setBuilding)
				.catch((err) => setError(err.message))
				.finally(() => setLoading(false));
		}
	}, [id]);

	if (loading) {
		return <LoadingSpinner />;
	}

	if (error || !building) {
		return <Navigate to="/" replace />;
	}

	const groupedFields = groupFieldsByCategory(building);
	const filledCategories = Object.keys(groupedFields).length;
	const totalFields = Object.values(groupedFields).flat().length;

	return (
		<Box maxW="5xl" mx="auto" p={{ base: '4', md: '8' }}>
			<BackLink />

			<Box
				bg="bg.surface"
				borderRadius="3xl"
				shadow="xl"
				border="1px"
				borderColor="border.default"
				overflow="hidden"
				mt="8"
			>
				<BuildingHeader
					name={building.menoBudovy}
					address={building.adresa}
					filledCategories={filledCategories}
					totalFields={totalFields}
					handleViewPdf={handleViewPdf}
					handleExportCsv={() =>
						handleExportCsv(building, fieldLabels, toaster)
					}
					handleExportPdf={() => {
						handleExportPdf(building, fieldLabels, toaster);
					}}
				/>
				<BuildingContent groupedFields={groupedFields} />
				<BuildingFooter
					createdAt={building.createdAt}
					updatedAt={building.updatedAt}
				/>
			</Box>
		</Box>
	);
}
