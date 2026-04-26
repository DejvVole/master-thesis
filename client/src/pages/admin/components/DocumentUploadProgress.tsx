import { useEffect, useState } from 'react';
import { Badge, Box, Flex, Progress, Text } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';

interface UploadProgressProps {
	progress: number;
	message: string;
	detail?: string;
	stage?: string;
	currentCategory?: number;
	totalCategories?: number;
	status: 'pending' | 'processing' | 'complete' | 'error';
	error?: string;
}

const stageLabels: Record<string, string> = {
	upload: 'Nahrávanie',
	document_loading: 'Načítanie dokumentu',
	chunking: 'Rozdeľovanie na časti',
	embedding: 'Vytváranie embeddingov',
	rag_extraction: 'RAG extrakcia',
	inference: 'AI inference',
	normalization: 'Normalizácia',
	database_save: 'Ukladanie do DB',
	minio_export: 'Export výsledkov',
	complete: 'Dokončené',
	error: 'Chyba',
};

export default function UploadProgress({
	progress,
	message,
	detail,
	stage,
	currentCategory,
	totalCategories,
	status,
	error,
}: UploadProgressProps) {
	const [dots, setDots] = useState('');

	// Animated dots for processing state
	useEffect(() => {
		if (status === 'processing') {
			const interval = setInterval(() => {
				setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
			}, 500);
			return () => clearInterval(interval);
		}
	}, [status]);

	// Toast notifications
	useEffect(() => {
		if (status === 'complete') {
			toaster.success({
				title: 'Dokument bol úspešne nahratý a spracovaný!',
				closable: true,
			});
		} else if (status === 'error' && error) {
			toaster.error({
				title: 'Chyba pri nahrávaní dokumentu',
				description: 'Nastala neznáma chyba.',
				closable: true,
			});
		}
	}, [status, error]);

	const stageLabel = stage ? stageLabels[stage] || stage : '';

	const getBadgeBg = () => {
		if (status === 'processing') return 'blue.100';
		if (status === 'complete') return 'green.100';
		if (status === 'error') return 'red.100';
		return 'gray.100';
	};

	const getBadgeColor = () => {
		if (status === 'processing') return 'blue.800';
		if (status === 'complete') return 'green.800';
		if (status === 'error') return 'red.800';
		return 'gray.800';
	};

	return (
		<Box w="full">
			{/* Status Badge */}
			<Flex align="center" justify="space-between" mb="3">
				<Badge
					px="4"
					py="1.5"
					borderRadius="xl"
					fontSize="xs"
					fontWeight="semibold"
					bg={getBadgeBg()}
					color={getBadgeColor()}
				>
					{stageLabel}
					{status === 'processing' && dots}
				</Badge>
				<Text fontSize="sm" fontWeight="bold" color="text.primary">
					{progress}%
				</Text>
			</Flex>

			{/* Progress Bar */}
			<Box
				w="full"
				bg="bg.canvas"
				borderRadius="full"
				h="3"
				mb="4"
				overflow="hidden"
			>
				<Box
					h="3"
					borderRadius="full"
					transition="all 0.3s ease-out"
					bgGradient="to-r"
					gradientFrom="blue.500"
					gradientTo="blue.600"
					style={{ width: `${progress}%` }}
				/>
			</Box>

			{/* Message */}
			<Box>
				<Text fontSize="sm" fontWeight="semibold" color="text.primary">
					{message}
				</Text>
				{detail && (
					<Text fontSize="xs" color="text.subtle">
						{detail}
					</Text>
				)}
			</Box>

			{/* Category Progress (for RAG extraction) */}
			{stage === 'rag_extraction' &&
				currentCategory !== undefined &&
				totalCategories !== undefined && (
					<Box mt="4" p="4" bg="bg.canvas" borderRadius="xl">
						<Flex
							justify="space-between"
							fontSize="xs"
							color="text.muted"
							mb="2"
							fontWeight="medium"
						>
							<Text>Kategória</Text>
							<Text>
								{currentCategory} / {totalCategories}
							</Text>
						</Flex>
						<Progress.Root
							value={(currentCategory / totalCategories) * 100}
							size="sm"
							borderRadius="full"
						>
							<Progress.Track bg="bg.canvas" borderRadius="full">
								<Progress.Range bg="green.500" borderRadius="full" />
							</Progress.Track>
						</Progress.Root>
					</Box>
				)}
		</Box>
	);
}
