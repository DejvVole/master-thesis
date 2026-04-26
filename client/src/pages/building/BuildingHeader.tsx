import {
	Badge,
	Box,
	Flex,
	Heading,
	HStack,
	Icon,
	IconButton,
	Text,
} from '@chakra-ui/react';
import { BsFiletypeCsv, BsFiletypePdf } from 'react-icons/bs';
import { FiDownload, FiMapPin } from 'react-icons/fi';
import { formatBuildingName } from '../../api/buildings';

export default function BuildingHeader({
	name,
	address,
	handleViewPdf,
	handleExportCsv,
	handleExportPdf,
	filledCategories,
	totalFields,
}: {
	name: string | null;
	address: string | null;
	filledCategories: number;
	totalFields: number;
	handleViewPdf: () => void;
	handleExportCsv: () => void;
	handleExportPdf: () => void;
}) {
	return (
		<Box
			bg="action.primary"
			px={{ base: '5', md: '10' }}
			py={{ base: '6', md: '8' }}
		>
			<HStack justify="space-between" align="flex-start" mb="2">
				<Heading
					fontSize={{ base: '3xl', md: '4xl' }}
					fontWeight="bold"
					color="action.onPrimary"
					mb="3"
				>
					{formatBuildingName(name) || 'Bez názvu'}
				</Heading>

				<Box gap="3" display="flex" alignItems="center">
					<IconButton
						variant="ghost"
						color="action.onPrimary"
						borderRadius="lg"
						onClick={handleViewPdf}
						title="Stiahnúť dokument"
					>
						<Icon as={FiDownload} boxSize="6" />
					</IconButton>
					<IconButton
						variant="ghost"
						color="action.onPrimary"
						borderRadius="lg"
						onClick={handleExportCsv}
						title="Export do CSV"
					>
						<Icon as={BsFiletypeCsv} boxSize="6" />
					</IconButton>
					<IconButton
						variant="ghost"
						color="action.onPrimary"
						borderRadius="lg"
						onClick={handleExportPdf}
						title="Export do PDF"
					>
						<Icon as={BsFiletypePdf} boxSize="6" />
					</IconButton>
				</Box>
			</HStack>

			{address && (
				<Flex color="action.onPrimary" opacity="0.9" align="center" gap="2">
					<Icon as={FiMapPin} boxSize="5" />
					<Text>{address}</Text>
				</Flex>
			)}
			<Flex gap="3" mt="4" flexWrap="wrap">
				<Badge
					px="3"
					py="1"
					bg="action.primaryPress"
					borderRadius="full"
					fontSize="sm"
					color="action.onPrimary"
				>
					{filledCategories} kategórií
				</Badge>
				<Badge
					px="3"
					py="1"
					bg="action.primaryPress"
					borderRadius="full"
					fontSize="sm"
					color="action.onPrimary"
				>
					{totalFields} údajov
				</Badge>
			</Flex>
		</Box>
	);
}
