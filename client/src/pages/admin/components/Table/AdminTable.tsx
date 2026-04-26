import { useState, Fragment } from 'react';
import { Box, Table } from '@chakra-ui/react';
import { toaster } from '../../../../components/ui/toaster';
import type { AdminDocument } from '../../../../api/admin';
import { adminApi, type CategorySource } from '../../../../api/admin';

import TableRow from './TableRow';
import TableHeader from './TableHeader';
import ExpandedRow from './ExpandedRow';

export default function AdminTable({
	documents,
	handleViewPdf,
	handleToggleVisibility,
	handleDelete,
	onDocumentUpdated,
}: {
	documents: AdminDocument[];
	handleViewPdf: (buildingId: number) => void;
	handleToggleVisibility: (docId: number) => void;
	handleDelete: (docId: number) => void;
	onDocumentUpdated?: () => void;
}) {
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
	const [loadingSources, setLoadingSources] = useState<Set<number>>(new Set());
	const [sourcesData, setSourcesData] = useState<
		Record<number, CategorySource[]>
	>({});
	const [updatingSourceId, setUpdatingSourceId] = useState<number | null>(null);

	const toggleRow = async (docId: number, buildingId?: number) => {
		const newExpanded = new Set(expandedRows);

		if (newExpanded.has(docId)) {
			newExpanded.delete(docId);
		} else {
			newExpanded.add(docId);

			if (buildingId && !sourcesData[buildingId]) {
				setLoadingSources((prev) => new Set(prev).add(docId));
				try {
					const sources = await adminApi.getBuildingSources(buildingId);
					setSourcesData((prev) => ({ ...prev, [buildingId]: sources }));
				} catch (err) {
					console.error('Failed to load sources:', err);
				} finally {
					setLoadingSources((prev) => {
						const next = new Set(prev);
						next.delete(docId);
						return next;
					});
				}
			}
		}

		setExpandedRows(newExpanded);
	};

	const handleUpdateSource = async (
		buildingId: number,
		sourceId: number,
		fieldName: string,
		newValue: string
	) => {
		setUpdatingSourceId(sourceId);
		try {
			const updatedSource = await adminApi.updateSourceValue(
				buildingId,
				sourceId,
				fieldName,
				newValue
			);

			// Update local state with new source data
			setSourcesData((prev) => ({
				...prev,
				[buildingId]: prev[buildingId].map((source) =>
					source.id === sourceId ? updatedSource : source
				),
			}));

			toaster.create({
				title: 'Hodnota bola aktualizovaná',
				type: 'success',
			});

			// Notify parent to refresh documents (for metadata update)
			onDocumentUpdated?.();
		} catch (err) {
			console.error('Failed to update source:', err);
			toaster.create({
				title: 'Chyba pri aktualizácii hodnoty',
				type: 'error',
			});
		} finally {
			setUpdatingSourceId(null);
		}
	};

	return (
		<Box overflowX="auto">
			<Table.Root size="md">
				<TableHeader />
				<Table.Body>
					{documents.map((doc) => (
						<Fragment key={doc.id}>
							<TableRow
								doc={doc}
								isExpanded={expandedRows.has(doc.id)}
								onToggle={() => toggleRow(doc.id, doc.building?.id)}
								onViewPdf={handleViewPdf}
								onToggleVisibility={handleToggleVisibility}
								onDelete={handleDelete}
							/>
							{expandedRows.has(doc.id) && (
								<ExpandedRow
									key={`${doc.id}-expanded`}
									isLoading={loadingSources.has(doc.id)}
									sources={
										doc.building ? sourcesData[doc.building.id] : undefined
									}
									onUpdateSource={
										doc.building
											? (sourceId, fieldName, newValue) =>
													handleUpdateSource(
														doc.building!.id,
														sourceId,
														fieldName,
														newValue
													)
											: undefined
									}
									updatingSourceId={updatingSourceId}
								/>
							)}
						</Fragment>
					))}
				</Table.Body>
			</Table.Root>
		</Box>
	);
}
