import { Box, Text } from '@chakra-ui/react';

interface CategoryStatsProps {
	extractedCount: number;
	inferredCount: number;
	missingCount: number;
	showInferred: boolean;
}

export default function CategoryStats({
	extractedCount,
	inferredCount,
	missingCount,
	showInferred,
}: CategoryStatsProps) {
	return (
		<Box spaceY="1">
			<Text color="gray.600">
				Extrahované:{' '}
				<Text as="span" fontWeight="semibold" color="gray.500">
					{extractedCount}
				</Text>
			</Text>
			{showInferred && (
				<Text color="gray.600">
					Odvodené:{' '}
					<Text as="span" fontWeight="semibold" color="gray.500">
						{inferredCount}
					</Text>
				</Text>
			)}
			<Text color="gray.600">
				Chýbajúce:{' '}
				<Text as="span" fontWeight="semibold" color="gray.500">
					{missingCount}
				</Text>
			</Text>
		</Box>
	);
}
