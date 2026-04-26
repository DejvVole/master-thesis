import { useState, useEffect } from 'react';
import { adminApi, type AdminDocument, type AdminStats } from '../../api/admin';

import { buildingsApi } from '../../api/buildings';
import AdminTable from './components/Table/AdminTable';
import {
	IoDocumentTextOutline,
	IoEyeOutline,
	IoEyeOffOutline,
	IoBulbOutline,
} from 'react-icons/io5';
import { StatCard } from './components/StatCard';
import { Box, Flex, Grid, Heading, Icon } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import { toaster } from '../../components/ui/toaster';
import BackLink from '../../components/BackLink';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Admin() {
	const [documents, setDocuments] = useState<AdminDocument[]>([]);
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [pdfUrlsByBuildingId, setPdfUrlsByBuildingId] = useState<
		Record<number, string>
	>({});

	const loadData = async () => {
		setLoading(true);
		try {
			const [docsData, statsData] = await Promise.all([
				adminApi.getDocuments(),
				adminApi.getStats(),
			]);
			setDocuments(docsData);
			setStats(statsData);
		} catch (err: any) {
			toaster.error({
				title: 'Chyba pri načítaní dát',
				description: 'Nepodarilo sa načítať dáta z API',
				closable: true,
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleToggleVisibility = async (docId: number) => {
		try {
			const result = await adminApi.toggleVisibility(docId);
			setDocuments((docs) =>
				docs.map((d) =>
					d.id === docId ? { ...d, isHidden: result.isHidden } : d
				)
			);
			const newStats = await adminApi.getStats();
			setStats(newStats);
		} catch (err: any) {
			toaster.error({
				title: 'Chyba pri aktualizaci viditelnosti',
				description: 'Nepodarilo sa aktualizovať viditeľnosť dokumentu',
				closable: true,
			});
		}
	};

	const handleDelete = async (docId: number) => {
		try {
			await adminApi.deleteDocument(docId);
			const deletedDocument = documents.find((d) => d.id === docId);
			const buildingId = deletedDocument?.building?.id;
			setDocuments((docs) => docs.filter((d) => d.id !== docId));
			const newStats = await adminApi.getStats();
			setStats(newStats);
			toaster.success({
				title: 'Dokument bol úspešne zmazaný',
				closable: true,
			});
			if (buildingId) {
				setPdfUrlsByBuildingId((prev) => {
					const next = { ...prev };
					delete next[buildingId];
					return next;
				});
			}
		} catch (err: any) {
			toaster.error({
				title: 'Chyba pri mazaní dokumentu',
				description: 'Nepodarilo sa zmazať dokument',
				closable: true,
			});
		}
	};

	const handleViewPdf = async (buildingId: number) => {
		if (!buildingId) {
			toaster.error({
				title: 'Chyba pri načítaní PDF',
				description: 'Dokument nemá priradenú budovu',
				closable: true,
			});
			return;
		}

		const cachedUrl = pdfUrlsByBuildingId[buildingId];
		if (cachedUrl) {
			window.open(cachedUrl, '_blank');
			return;
		}

		try {
			const url = await buildingsApi.getPdfUrl(buildingId);
			setPdfUrlsByBuildingId((prev) => ({
				...prev,
				[buildingId]: url,
			}));
			window.open(url, '_blank');
		} catch (err) {
			toaster.error({
				title: 'Chyba pri načítaní PDF',
				description: 'Nepodarilo sa načítať PDF dokument',
				closable: true,
			});
		}
	};

	return (
		<Box maxW="7xl" mx="auto" p={{ base: '4', md: '6' }}>
			<Flex
				justify="space-between"
				align={{ base: 'flex-start', md: 'center' }}
				mb="8"
				gap={{ base: '3', md: '6' }}
				flexWrap="wrap"
			>
				<Heading
					fontSize={{ base: '2xl', md: '3xl' }}
					fontWeight="bold"
					color="text.primary"
				>
					Administrácia
				</Heading>
				<BackLink />
			</Flex>

			{/* Upload Tab */}
			<DocumentUpload onUpload={loadData} />

			<Box my="10" borderTop="1px" borderColor="border.default" />

			{/* Stats Cards */}
			{stats && (
				<Grid
					templateColumns={{
						base: '1fr',
						sm: 'repeat(2, 1fr)',
						lg: 'repeat(4, 1fr)',
					}}
					gap={{ base: '4', md: '6' }}
					mb="8"
					mt="6"
				>
					<StatCard
						label="Celkom dokumentov"
						value={stats.totalDocuments}
						icon={<Icon as={IoDocumentTextOutline} boxSize="6" />}
					/>
					<StatCard
						label="Viditeľné"
						value={stats.visibleDocuments}
						icon={<Icon as={IoEyeOutline} boxSize="6" color="green.600" />}
					/>
					<StatCard
						label="Skryté"
						value={stats.hiddenDocuments}
						icon={<Icon as={IoEyeOffOutline} boxSize="6" color="red.600" />}
					/>
					<StatCard
						label="AI inferencia zapnutá"
						value={stats.inferenceEnabled}
						icon={<Icon as={IoBulbOutline} boxSize="6" color="blue.600" />}
					/>
				</Grid>
			)}

			{/* Documents Tab */}
			<Box
				bg="bg.surface"
				borderRadius="2xl"
				shadow="sm"
				border="1px"
				borderColor="border.default"
				overflow="hidden"
			>
				{loading ? (
					<LoadingSpinner text="Načítavam dokumenty..." />
				) : documents.length === 0 ? (
					<Box p="12" textAlign="center" color="text.subtle">
						<Flex
							w="16"
							h="16"
							mx="auto"
							mb="4"
							bg="action.secondaryHover"
							borderRadius="2xl"
							align="center"
							justify="center"
						>
							<Icon
								as={IoDocumentTextOutline}
								boxSize="8"
								color="action.primary"
							/>
						</Flex>
						Žiadne dokumenty neboli nájdené
					</Box>
				) : (
					<AdminTable
						documents={documents}
						handleViewPdf={handleViewPdf}
						handleToggleVisibility={handleToggleVisibility}
						handleDelete={handleDelete}
						onDocumentUpdated={loadData}
					/>
				)}
			</Box>
		</Box>
	);
}
