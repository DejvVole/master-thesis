import { Box, Grid, Heading, Table, Text } from '@chakra-ui/react';
import CategoryCard from './CategoryCard';
import type { CategorySource } from '../../../../api/admin';
import LoadingSpinner from '../../../../components/LoadingSpinner';

interface ExpandedRowProps {
	isLoading: boolean;
	sources: CategorySource[] | undefined;
	onUpdateSource?: (
		sourceId: number,
		fieldName: string,
		newValue: string
	) => Promise<void>;
	updatingSourceId?: number | null;
}

export default function ExpandedRow({
	isLoading,
	sources,
	onUpdateSource,
	updatingSourceId,
}: ExpandedRowProps) {
	return (
		<Table.Row>
			<Table.Cell colSpan={8} px="6" py="6">
				{isLoading ? (
					<LoadingSpinner text="Načítavam kategórie..." />
				) : sources && sources.length > 0 ? (
					<Box>
						<Heading
							as="h4"
							fontWeight="bold"
							mb="4"
							display="flex"
							alignItems="center"
							gap="2"
							fontSize="md"
						>
							Extrahované kategórie ({sources.length})
						</Heading>
						<Grid
							gap="4"
							gridTemplateColumns={{
								base: '1fr',
								md: 'repeat(2, 1fr)',
								lg: 'repeat(3, 1fr)',
							}}
						>
							{sources.map((source) => (
								<CategoryCard
									key={source.id}
									source={source}
									onUpdate={onUpdateSource}
									isUpdating={updatingSourceId === source.id}
								/>
							))}
						</Grid>
					</Box>
				) : (
					<Box textAlign="center" py="8">
						<Text color="text.subtle">Žiadne kategórie nie sú dostupné</Text>
					</Box>
				)}
			</Table.Cell>
		</Table.Row>
	);
}
