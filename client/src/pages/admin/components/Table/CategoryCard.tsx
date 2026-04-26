import { useState } from 'react';
import {
	Badge,
	Box,
	Flex,
	Text,
	Input,
	Textarea,
	IconButton,
} from '@chakra-ui/react';
import { LuPencil, LuCheck, LuX } from 'react-icons/lu';
import type { CategorySource } from '../../../../api/admin';

const sourceTypeStyles: Record<string, { bg: string; color: string }> = {
	EXTRACTED: { bg: 'green.100', color: 'green.800' },
	INFERRED: { bg: 'blue.100', color: 'blue.800' },
	MISSING: { bg: 'gray.100', color: 'gray.700' },
	EDITED: { bg: 'orange.100', color: 'orange.800' },
};

const confidenceLabels: Record<string, string> = {
	HIGH: 'Vysoká',
	MEDIUM: 'Stredná',
	LOW: 'Nízka',
};

const confidenceStyles: Record<string, { bg: string; color: string }> = {
	HIGH: { bg: 'green.100', color: 'green.800' },
	MEDIUM: { bg: 'yellow.100', color: 'yellow.800' },
	LOW: { bg: 'red.100', color: 'red.800' },
};

interface CategoryCardProps {
	source: CategorySource;
	onUpdate?: (
		sourceId: number,
		fieldName: string,
		newValue: string
	) => Promise<void>;
	isUpdating?: boolean;
}

export default function CategoryCard({
	source,
	onUpdate,
	isUpdating,
}: CategoryCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(source.value || '');

	const typeStyle = sourceTypeStyles[source.sourceType] || {
		bg: 'gray.100',
		color: 'gray.700',
	};
	const confidenceKey = source.confidence?.toString().toUpperCase() || '';
	const confidenceStyle = confidenceStyles[confidenceKey] || {
		bg: 'gray.100',
		color: 'gray.500',
	};

	const handleStartEdit = () => {
		setEditValue(source.value || '');
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		setEditValue(source.value || '');
		setIsEditing(false);
	};

	const handleSaveEdit = async () => {
		if (onUpdate) {
			await onUpdate(source.id, source.fieldName, editValue);
			setIsEditing(false);
		}
	};

	const isLongText = (source.value?.length || 0) > 100;

	return (
		<Box
			borderRadius="xl"
			shadow="md"
			p="4"
			_hover={{
				shadow: 'lg',
			}}
			transition="all 0.2s"
		>
			<Flex align="flex-start" justify="space-between" mb="2">
				<Box flex="1">
					<Flex justify="space-between" gap="2" mb="2">
						<Flex flexWrap="wrap" align="center" gap="2" minW="0">
							<Text fontWeight="semibold" color="text.primary">
								{source.label}
							</Text>
							<Badge
								px="2"
								py="0.5"
								fontSize="sm"
								borderRadius="lg"
								bg={typeStyle.bg}
								color={typeStyle.color}
							>
								{source.sourceType === 'EXTRACTED'
									? 'Extrahované'
									: source.sourceType === 'INFERRED'
										? 'Odvodené'
										: source.sourceType === 'EDITED'
											? 'Upravené'
											: 'Chýba'}
							</Badge>
						</Flex>
						{!isEditing && onUpdate && (
							<IconButton
								aria-label="Upraviť hodnotu"
								size="xs"
								variant="ghost"
								onClick={handleStartEdit}
								flexShrink={0}
							>
								<LuPencil />
							</IconButton>
						)}
					</Flex>

					{source.sourceType === 'INFERRED' && source.confidence && (
						<Badge
							px="2"
							py="0.5"
							fontSize="sm"
							borderRadius="lg"
							bg={confidenceStyle.bg}
							color={confidenceStyle.color}
							mb="2"
						>
							{confidenceLabels[confidenceKey] || source.confidence}
						</Badge>
					)}

					{isEditing ? (
						<Box>
							{isLongText ? (
								<Textarea
									value={editValue}
									onChange={(e) => setEditValue(e.target.value)}
									placeholder="Zadajte hodnotu..."
									size="sm"
									rows={4}
									autoFocus
								/>
							) : (
								<Input
									value={editValue}
									onChange={(e) => setEditValue(e.target.value)}
									placeholder="Zadajte hodnotu..."
									size="sm"
									autoFocus
								/>
							)}
							<Flex gap="2" mt="2" justify="flex-end">
								<IconButton
									aria-label="Zrušiť"
									size="sm"
									variant="ghost"
									colorPalette="red"
									onClick={handleCancelEdit}
									disabled={isUpdating}
								>
									<LuX />
								</IconButton>
								<IconButton
									aria-label="Uložiť"
									size="sm"
									variant="solid"
									colorPalette="green"
									onClick={handleSaveEdit}
									loading={isUpdating}
								>
									<LuCheck />
								</IconButton>
							</Flex>
						</Box>
					) : (
						<Text color="text.muted" lineHeight="relaxed">
							{source.value || (
								<Text as="span" fontStyle="italic" color="text.subtle">
									Hodnota nie je dostupná
								</Text>
							)}
						</Text>
					)}

					{source.sourceType === 'EDITED' && source.originalSourceType && (
						<Text mt="2" fontSize="sm" color="orange.600">
							<Text as="span" fontWeight="medium">
								Pôvodne:{' '}
							</Text>
							{source.originalSourceType === 'EXTRACTED'
								? 'Extrahované'
								: source.originalSourceType === 'INFERRED'
									? 'Odvodené'
									: 'Chýbajúce'}
						</Text>
					)}
					{source.sourceType === 'INFERRED' && source.reasoning && (
						<Text mt="2" fontSize="sm" color="text.subtle">
							<Text as="span" fontWeight="medium">
								Zdôvodnenie:{' '}
							</Text>
							{source.reasoning}
						</Text>
					)}
				</Box>
			</Flex>
		</Box>
	);
}
