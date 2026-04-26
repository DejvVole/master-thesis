import { SlArrowRight } from 'react-icons/sl';
import { Link } from 'react-router-dom';
import { Badge, Box, Flex, Icon, Table, Text } from '@chakra-ui/react';
import { LuPencil } from 'react-icons/lu';
import type { AdminDocument } from '../../../../api/admin';
import { Tooltip } from '../../../../components/ui/tooltip';
import ActionMenu from './ActionMenu';
import CategoryStats from './CategoryStats';
import StatusBadge from './StatusBadge';

interface TableRowProps {
	doc: AdminDocument;
	isExpanded: boolean;
	onToggle: () => void;
	onViewPdf: (buildingId: number) => void;
	onToggleVisibility: (docId: number) => void;
	onDelete: (docId: number) => void;
}

export default function TableRow({
	doc,
	isExpanded,
	onToggle,
	onViewPdf,
	onToggleVisibility,
	onDelete,
}: TableRowProps) {
	return (
		<Table.Row
			cursor="pointer"
			transition="colors"
			_hover={{
				bg: 'bg.canvas',
			}}
			borderBottomWidth={isExpanded ? '0' : undefined}
			onClick={onToggle}
		>
			<Table.Cell px="6" py="4" whiteSpace="nowrap" textAlign="right">
				<Box
					display="inline-block"
					transition="transform 0.2s"
					transform={isExpanded ? 'rotate(90deg)' : undefined}
					color={isExpanded ? 'action.primary' : 'text.subtle'}
				>
					<Icon as={SlArrowRight} />
				</Box>
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap" maxW="200px">
				<Flex align="center" gap="2" minW="0">
					<Tooltip content={doc.fileName}>
						<Text
							fontWeight="semibold"
							color="text.primary"
							minW="0"
							overflow="hidden"
							textOverflow="ellipsis"
							whiteSpace="nowrap"
						>
							{doc.fileName}
						</Text>
					</Tooltip>
					{doc.metadata?.manually_edited && (
						<Badge
							px="2"
							py="0.5"
							fontSize="xs"
							borderRadius="lg"
							bg="orange.100"
							color="orange.800"
							display="flex"
							alignItems="center"
							gap="1"
							flexShrink={0}
						>
							<Icon as={LuPencil} boxSize="3" />
							Upravené
						</Badge>
					)}
				</Flex>
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap">
				{doc.building ? (
					<Link to={`/buildings/${doc.building.id}`}>
						<Text
							as="span"
							fontWeight="medium"
							_hover={{ color: 'action.primaryHover' }}
							transition="colors"
						>
							{doc.building.menoBudovy || 'Nepomenovaná'}
						</Text>
					</Link>
				) : (
					<Text color="text.subtle">-</Text>
				)}
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap">
				<StatusBadge
					enabled={doc.inferenceEnabled}
					enabledLabel="Zapnutá"
					disabledLabel="Vypnutá"
				/>
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap" fontSize="sm">
				<CategoryStats
					extractedCount={doc.extractedCount}
					inferredCount={doc.inferredCount}
					missingCount={doc.missingCount}
					showInferred={doc.inferenceEnabled}
				/>
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap">
				<StatusBadge
					enabled={!doc.isHidden}
					enabledLabel="Viditeľný"
					disabledLabel="Skrytý"
				/>
			</Table.Cell>
			<Table.Cell px="6" py="4" whiteSpace="nowrap" color="text.subtle">
				{doc.processedDate
					? new Date(doc.processedDate).toLocaleDateString('sk-SK')
					: '-'}
			</Table.Cell>
			<Table.Cell
				px="6"
				py="4"
				whiteSpace="nowrap"
				fontSize="sm"
				fontWeight="medium"
				onClick={(e) => e.stopPropagation()}
			>
				<ActionMenu
					doc={doc}
					onViewPdf={onViewPdf}
					onToggleVisibility={onToggleVisibility}
					onDelete={onDelete}
				/>
			</Table.Cell>
		</Table.Row>
	);
}
