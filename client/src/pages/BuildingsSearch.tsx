/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { buildingsApi, type Building } from '../api/buildings';
import BuildingCard from './building/BuildingCard';
import Filters from './filters/Filters';
import type { BuildingFilters } from './filters/Filters.helper';

import { FaRegBuilding } from 'react-icons/fa';
import { AiOutlineMenu } from 'react-icons/ai';
import { Box, Flex, Grid, Heading, Icon, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import LoadingSpinner from '../components/LoadingSpinner';

export default function BuildingsSearch() {
	const [buildings, setBuildings] = useState<Building[]>([]);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState<BuildingFilters>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(true);

	const loadBuildings = async () => {
		setLoading(true);
		try {
			const data = await buildingsApi.getAll();
			setBuildings(data);
		} catch (err: any) {
			toaster.error({
				title: 'Chyba pri načítavaní budov',
				closable: true,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = async () => {
		setLoading(true);
		try {
			let data: Building[];
			if (searchQuery.trim()) {
				data = await buildingsApi.searchSemantic(searchQuery);
			} else if (
				Object.keys(filters).some((k) => filters[k as keyof BuildingFilters])
			) {
				data = await buildingsApi.getFiltered(filters);
			} else {
				data = await buildingsApi.getAll();
			}

			setBuildings(data);
		} catch (err: any) {
			toaster.error({
				title: 'Chyba pri vyhľadávaní',
				closable: true,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setFilters({});
		setSearchQuery('');
		loadBuildings();
	};

	useEffect(() => {
		loadBuildings();
	}, []);

	return (
		<Box>
			<Flex direction={{ base: 'column', lg: 'row' }}>
				{/* LEFT SIDEBAR - FILTERS */}
				<Box
					minH={{ base: 'auto', lg: '100vh' }}
					w={{ base: 'full', lg: 'auto' }}
					bg="bg.surface"
					p={{ base: '3', md: '4' }}
					borderRight="1px solid"
					borderColor="border.primary"
				>
					<Icon
						as={AiOutlineMenu}
						boxSize="10"
						onClick={() => setShowFilters(!showFilters)}
						color="action.primary"
						padding="2"
						backgroundColor="#6fa8a11f"
						cursor="pointer"
						borderRadius="md"
						transition="transform 0.2s ease-in-out"
						_hover={{ transform: 'scale(1.05)' }}
					/>
				</Box>

				<Box
					as="aside"
					w={{ base: 'full', lg: showFilters ? '72' : '0' }}
					flexShrink="0"
					transition="all 0.2s ease-in-out"
					opacity={{ base: 1, lg: showFilters ? 1 : 0 }}
					overflow={{ base: 'visible', lg: 'visible' }}
					display={{ base: showFilters ? 'block' : 'none', lg: 'block' }}
					borderColor="border.primary"
				>
					<Filters
						filters={filters}
						setFilters={setFilters}
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						loading={loading}
						handleSearch={handleSearch}
						handleReset={handleReset}
					/>
				</Box>
				{/* RIGHT CONTENT - RESULTS */}
				<Box flex="1" p={{ base: '4', md: '6' }}>
					{/* HEADER */}
					<Box mb="8">
						<Heading
							as="h1"
							fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }}
							fontWeight="bold"
							color="text.primary"
							mb="2"
						>
							Historické budovy
						</Heading>
						<Text color="text.muted">
							Prehľadajte našu kolekciu{' '}
							<Text as="span" fontWeight="semibold" color="action.primary">
								{buildings.length}
							</Text>{' '}
							historických stavieb
						</Text>
					</Box>

					{/* LOADING STATE */}
					{loading ? (
						<LoadingSpinner text="Načítavam budovy..." />
					) : (
						<>
							{/* BUILDINGS GRID */}
							{buildings.length > 0 ? (
								<Grid
									templateColumns={{
										base: '1fr',
										sm: 'repeat(auto-fill, minmax(360px, 1fr))',
										lg: 'repeat(auto-fill, minmax(550px, 1fr))',
									}}
									gap={{ base: '4', md: '6' }}
								>
									{buildings.map((building) => (
										<BuildingCard key={building.id} building={building} />
									))}
								</Grid>
							) : (
								<VStack
									textAlign="center"
									py="20"
									bg="bg.surface"
									borderRadius="xl"
									border="1px"
									borderColor="border.default"
								>
									<Box
										p="4"
										mb="6"
										bg="action.secondaryHover"
										color="action.primary"
										borderRadius="xl"
									>
										<Icon as={FaRegBuilding} boxSize="10" />
									</Box>
									<Text color="text.subtle" fontSize="lg" mb="4">
										Žiadne budovy nezodpovedajú vašim filtrom
									</Text>
								</VStack>
							)}
						</>
					)}
				</Box>
			</Flex>
		</Box>
	);
}
