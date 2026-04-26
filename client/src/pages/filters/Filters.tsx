// filepath: client/src/pages/filters/Filters.tsx
import { useEffect, useState } from 'react';
import { buildingsApi } from '../../api/buildings';
import {
	DropdownFilters,
	FilterKeyMap,
	type BuildingFilters,
	type FilterOptions,
} from './Filters.helper';

import { FaMinus, FaPlus } from 'react-icons/fa6';
import {
	Box,
	Button,
	Checkbox,
	Flex,
	Heading,
	HStack,
	Icon,
	Input,
	Spinner,
	Text,
	VStack,
} from '@chakra-ui/react';
import CustomDropdown from './CustomDropdown';
import { toaster } from '../../components/ui/toaster';

interface FiltersProps {
	filters: BuildingFilters;
	setFilters: (filters: BuildingFilters) => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	loading: boolean;
	handleSearch: () => void;
	handleReset: () => void;
}

export default function Filters({
	filters,
	setFilters,
	searchQuery,
	setSearchQuery,
	loading,
	handleSearch,
	handleReset,
}: FiltersProps) {
	// Filter options (normalizované hodnoty z DB)
	const [filterOptions, setFilterOptions] = useState<FilterOptions>({
		typyStrechy: [],
		materialyFasady: [],
		materialyInterieru: [],
		stavy: [],
		obdobia: [],
	});

	// Filter panel expanded states
	const [expandedSections, setExpandedSections] = useState<
		Record<FilterKeyMap, boolean>
	>({
		[FilterKeyMap.rokVystavby]: true,
		[FilterKeyMap.rokVystavbyOd]: true,
		[FilterKeyMap.rokVystavbyDo]: true,
		[FilterKeyMap.typStrechy]: true,
		[FilterKeyMap.materialFasady]: true,
		[FilterKeyMap.materialInterieru]: true,
		[FilterKeyMap.obdobie]: true,
		[FilterKeyMap.aktualnyStav]: true,
	});

	const handleFilterChange = (key: keyof BuildingFilters, value: string) => {
		if (value === '') {
			const updatedFilters = { ...filters };
			delete updatedFilters[key];
			setFilters(updatedFilters);
			return;
		}
		setFilters({
			...filters,
			[key]: value || undefined,
		});
	};

	const toggleSection = (section: FilterKeyMap) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	useEffect(() => {
		buildingsApi
			.getFilterOptions()
			.then(setFilterOptions)
			.catch(() =>
				toaster.error({
					title: 'Chyba načítania filtrov',
					description: 'Prosím, skúste to znova neskôr.',
					closable: true,
				})
			);
	}, []);

	return (
		<Box
			bg="bg.surface"
			shadow={{ base: 'none', lg: 'sm' }}
			p={{ base: '4', md: '6' }}
			display="flex"
			flexDirection="column"
			minH={{ base: 'auto', lg: '100vh' }}
		>
			<Heading
				size={{ base: 'lg', md: 'xl' }}
				fontWeight="bold"
				mb="6"
				color="text.primary"
			>
				Filtre
			</Heading>
			<Box pt="0">
				{/* SEMANTIC SEARCH */}
				<Box mb="6" pb="6">
					<Text fontWeight="semibold" mb="3" fontSize="md" color="text.primary">
						Sémantické vyhľadávanie
					</Text>
					<Input
						type="text"
						placeholder="napr. 'gotický kostol z 15. storočia...'"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
						px="4"
						fontSize="sm"
						borderRadius="l"
						borderColor="border.primary"
						_hover={{ borderColor: 'border.strong' }}
						_focus={{ borderColor: 'border.strong' }}
					/>
					<Text fontSize="sm" mt="2" color="text.secondary">
						Popíšte, čo hľadáte
					</Text>
				</Box>

				{/* YEAR BUILT FILTER */}
				<Box mb="6" pb="6">
					<Button
						onClick={() => toggleSection('rokVystavby' as FilterKeyMap)}
						w="full"
						justifyContent="space-between"
						bg="transparent"
						p="0"
					>
						<Text fontWeight="semibold" fontSize="md" color="text.primary">
							Rok výstavby
						</Text>
						<Icon
							as={expandedSections.rokVystavby ? FaMinus : FaPlus}
							color="text.secondary"
						/>
					</Button>

					<Box
						overflow="hidden"
						maxH={expandedSections.rokVystavby ? '200px' : '0'}
						opacity={expandedSections.rokVystavby ? 1 : 0}
						transition="max-height 0.25s ease-in-out, opacity 0.2s ease-in-out"
					>
						<VStack mt="4" gap="3">
							<Input
								type="number"
								placeholder="Od"
								min={0}
								max={2100}
								value={filters.rokVystavbyOd || ''}
								onChange={(e) =>
									handleFilterChange(FilterKeyMap.rokVystavbyOd, e.target.value)
								}
								px="4"
								fontSize="sm"
								borderRadius="l"
								borderColor="border.primary"
								_hover={{ borderColor: 'border.strong' }}
								_focus={{ borderColor: 'border.strong' }}
							/>
							<Input
								type="number"
								placeholder="Do"
								min={0}
								max={2100}
								value={filters[FilterKeyMap.rokVystavbyDo] || ''}
								onChange={(e) =>
									handleFilterChange(FilterKeyMap.rokVystavbyDo, e.target.value)
								}
								px="4"
								fontSize="sm"
								borderRadius="l"
								borderColor="border.primary"
								_hover={{ borderColor: 'border.strong' }}
								_focus={{ borderColor: 'border.strong' }}
							/>
						</VStack>
					</Box>
				</Box>

				{/* PERIOD FILTER */}
				<Box mb="6" pb="6">
					<Button
						onClick={() => toggleSection(FilterKeyMap.obdobie)}
						w="full"
						justifyContent="space-between"
						bg="transparent"
						p="0"
					>
						<Text fontWeight="semibold" fontSize="md" color="text.primary">
							Historické obdobie
						</Text>
						<Icon
							as={expandedSections.obdobie ? FaMinus : FaPlus}
							color="text.secondary"
						/>
					</Button>

					<Box
						overflow="hidden"
						maxH={expandedSections[FilterKeyMap.obdobie] ? '500px' : '0'}
						opacity={expandedSections[FilterKeyMap.obdobie] ? 1 : 0}
						transition="max-height 0.25s ease-in-out, opacity 0.2s ease-in-out"
					>
						<VStack mt="4" gap="2" align="stretch">
							{filterOptions.obdobia.map((option) => (
								<Checkbox.Root
									key={option.value}
									checked={filters.obdobie === option.value}
									onCheckedChange={(e) =>
										handleFilterChange(
											FilterKeyMap.obdobie,
											e.checked ? option.value : ''
										)
									}
									cursor="pointer"
									p="0.5"
									variant="outline"
								>
									<Checkbox.HiddenInput />
									<Checkbox.Control
										cursor="pointer"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
										_checked={{
											bg: 'border.action',
											color: 'white',
											outline: 'none',
											borderColor: 'transparent',
										}}
									>
										<Checkbox.Indicator />
									</Checkbox.Control>
									<Checkbox.Label ml="2" fontSize="sm">
										{option.label}
									</Checkbox.Label>
								</Checkbox.Root>
							))}
						</VStack>
					</Box>
				</Box>

				{/* DROPDOWN FILTERS */}
				<Box mb="6" pb="6">
					{DropdownFilters.map((dropdown) => (
						<Box key={dropdown.filterKey} mb="4" _last={{ mb: '0' }}>
							<Button
								onClick={() => toggleSection(dropdown.filterKey)}
								w="full"
								justifyContent="space-between"
								bg="transparent"
								p="0"
							>
								<Text fontWeight="semibold" fontSize="md" color="text.primary">
									{dropdown.displayName}
								</Text>
								<Icon
									as={expandedSections[dropdown.filterKey] ? FaMinus : FaPlus}
									color="text.secondary"
								/>
							</Button>

							<Box
								overflow="hidden"
								maxH={expandedSections[dropdown.filterKey] ? '150px' : '0'}
								opacity={expandedSections[dropdown.filterKey] ? 1 : 0}
								transition="max-height 0.25s ease-in-out, opacity 0.2s ease-in-out"
							>
								<Box
									mt="4"
									pb="4"
									borderBottom="1px"
									borderColor="border.primary"
									_last={{ borderBottom: '0' }}
								>
									<CustomDropdown
										value={filters[dropdown.filterKey] || ''}
										onChange={(value) =>
											handleFilterChange(dropdown.filterKey, value)
										}
										options={filterOptions[dropdown.filterOptionsKey]}
										placeholder="Všetky"
									/>
								</Box>
							</Box>
						</Box>
					))}
				</Box>
			</Box>

			{/* ACTION BUTTONS */}
			<Flex
				gap="3"
				p={{ base: '4', md: '6' }}
				pt={{ base: '3', md: '4' }}
				position={{ base: 'static', md: 'sticky' }}
				bottom="0"
				m={{ base: '-4', md: '-6' }}
				mt={{ base: '0', md: 'auto' }}
				shadow={{
					base: 'none',
					md: '0 -4px 6px -1px rgba(0,0,0,0.1)',
				}}
				bg="bg.surface"
				zIndex={{ base: 'auto', md: 1 }}
			>
				<Button onClick={handleReset} variant="outline">
					Vynulovať
				</Button>
				<Button
					onClick={handleSearch}
					disabled={
						loading || (Object.keys(filters).length === 0 && !searchQuery)
					}
					flex="1"
					variant="solid"
				>
					{loading ? (
						<HStack gap="2" justify="center">
							<Spinner size="sm" color="action.onPrimary" borderWidth="2px" />
							<Text>Vyhľadávam...</Text>
						</HStack>
					) : (
						'Použiť'
					)}
				</Button>
			</Flex>
		</Box>
	);
}
