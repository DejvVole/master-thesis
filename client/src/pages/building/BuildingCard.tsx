import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
	buildingsApi,
	formatBuildingName,
	type Building,
} from '../../api/buildings';
import {
	Box,
	Flex,
	Heading,
	Icon,
	IconButton,
	Menu,
	Portal,
	Tag,
	Text,
} from '@chakra-ui/react';
import { FiDownload, FiMapPin } from 'react-icons/fi';
import {
	BsBuilding,
	BsFiletypeCsv,
	BsFiletypePdf,
	BsHouseDoor,
} from 'react-icons/bs';
import { FaChurch } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { toaster } from '../../components/ui/toaster';
import { HiDotsVertical } from 'react-icons/hi';
import { handleExportCsv } from '../../utils/csvExport';
import { handleExportPdf } from '../../utils/pdfExport';
import { Tooltip } from '../../components/ui/tooltip';

const fieldLabels: Record<string, string> = {
	menoBudovy: 'Meno budovy',
	adresa: 'Adresa',
	gpsSuradnice: 'GPS súradnice',
	rokVystavby: 'Rok výstavby',
	aktualnyVlastnik: 'Aktuálny vlastník',
	rokZaradenia: 'Rok zaradenia',
	historickyVyznam: 'Historický význam',
	zaznamyOObnove: 'Záznamy o obnove',
	materialVonkajsejFasady: 'Materiál vonkajšej fasády',
	typStrechy: 'Typ strechy',
	materialInterieru: 'Materiál interiéru',
	ineMaterialy: 'Iné materiály',
	aktualnyStav: 'Aktuálny stav',
	kritickeMiesta: 'Kritické miesta',
	potrebneSanacie: 'Potrebné sanácie',
	sucasneFotografie: 'Súčasné fotografie',
	historickeFotografie: 'Historické fotografie',
	planyASchemy: 'Plány a schémy',
	harmonogramUdrzby: 'Harmonogram údržby',
	revizneZaznamy: 'Revízne záznamy',
	ochranneZony: 'Ochranné zóny',
	povoleniaNaZasahy: 'Povolenia na zásahy',
	legislativneObmedzenia: 'Legislatívne obmedzenia',
	digitalneVykresy: 'Digitálne výkresy',
	archeologickeVyskumy: 'Archeologické výskumy',
	chemickeAnalyzy: 'Chemické analýzy',
};

function getBuildingIcon(name: string | null | undefined): IconType {
	const lower = (name ?? '').toLowerCase();
	if (
		lower.includes('kostol') ||
		lower.includes('katedrála') ||
		lower.includes('katedrala')
	) {
		return FaChurch;
	}
	if (lower.includes('dom')) {
		return BsHouseDoor;
	}
	return BsBuilding;
}

const tags: { key: keyof Building; tooltip: string }[] = [
	{ key: 'rokVystavby', tooltip: 'Rok výstavby' },
	{ key: 'aktualnyStav', tooltip: 'Aktuálny stav' },
];

interface BuildingCardProps {
	building: Building;
}

export default function BuildingCard({ building }: BuildingCardProps) {
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);

	const handleViewPdf = async () => {
		if (pdfUrl) {
			window.open(pdfUrl, '_blank');
			return;
		}

		try {
			const url = await buildingsApi.getPdfUrl(building.id);
			setPdfUrl(url);
			window.open(url, '_blank');
		} catch (err) {
			console.error('Failed to load PDF:', err);
			toaster.warning({
				title: 'Nepodarilo sa načítať PDF',
				closable: true,
			});
		}
	};

	return (
		<Box
			bg="bg.surface"
			borderRadius="xl"
			shadow="sm"
			_hover={{ borderColor: 'action.primary', shadow: 'xl' }}
			transition="all 0.3s"
			role="group"
			w="100%"
		>
			<Flex
				gap={{ base: '3', sm: '4' }}
				direction={{ base: 'column', sm: 'row' }}
				height="100%"
			>
				{/* ICON */}
				<Box
					flexShrink="0"
					bg="action.secondaryHover"
					borderLeftRadius={{ base: 'xl', sm: 'xl' }}
					borderTopRightRadius={{ base: 'xl', sm: '0' }}
					borderBottomRightRadius={{ base: 'xl', sm: '0' }}
					p={{ base: '3', sm: '4' }}
					w={{ base: 'full', sm: 'auto' }}
				>
					<Flex align="center" justify="center" alignItems="center">
						<Icon
							as={getBuildingIcon(building.menoBudovy)}
							boxSize={{ base: '8', sm: '10' }}
							color="action.primary"
						/>
					</Flex>
				</Box>

				{/* CONTENT */}
				<Box p={{ base: '3', sm: '4' }} flex="1">
					<Flex justify="space-between" align="flex-start" mb="2">
						<Link to={`/buildings/${building.id}`}>
							<Heading
								fontSize={{ base: 'lg', sm: 'xl' }}
								fontWeight="bold"
								color="text.primary"
								_hover={{
									color: 'action.primary',
								}}
								transition="all 0.2s"
							>
								{formatBuildingName(building.menoBudovy) ||
									'Nepomenovaná budova'}
							</Heading>
						</Link>
					</Flex>

					<Flex color="text.muted" mb="3" align="center" gap="2">
						<Icon as={FiMapPin} boxSize="4" color="text.subtle" />
						<Text>{building.adresa || 'Adresa nie je dostupná'}</Text>
					</Flex>

					{/* TAGS */}
					<Flex flexWrap="wrap" gap="2">
						{tags.map((tag) => {
							const value = building[tag.key];
							if (!value) return null;
							return (
								<Tooltip content={tag.tooltip}>
									<Tag.Root
										key={tag.key}
										size="sm"
										px="3"
										py="1.5"
										bg="action.secondaryHover"
										borderRadius="xl"
									>
										<Tag.Label fontWeight="medium">{value}</Tag.Label>
									</Tag.Root>
								</Tooltip>
							);
						})}
					</Flex>
				</Box>
				<Box
					p={{ base: '3', sm: '4' }}
					ml={{ base: '0', sm: 'auto' }}
					w={{ base: 'full', sm: 'auto' }}
					alignSelf={{ base: 'flex-end', sm: 'auto' }}
				>
					<Menu.Root>
						<Menu.Trigger asChild>
							<IconButton
								variant="ghost"
								size="sm"
								onClick={(e) => e.stopPropagation()}
							>
								<Icon as={HiDotsVertical} fontSize="lg" />
							</IconButton>
						</Menu.Trigger>
						<Portal>
							<Menu.Positioner>
								<Menu.Content
									borderRadius="l"
									shadow="xl"
									borderColor="border.default"
									zIndex="50"
								>
									<Menu.Item
										value="download"
										px="4"
										py="3"
										gap="3"
										cursor="pointer"
										_hover={{
											bg: 'action.secondaryHover',
										}}
										onClick={handleViewPdf}
									>
										<Icon as={FiDownload} size="sm" />
										Stiahnuť dokument
									</Menu.Item>
									<Menu.Item
										value="export-csv"
										px="4"
										py="3"
										gap="3"
										cursor="pointer"
										_hover={{
											bg: 'action.secondaryHover',
										}}
										onClick={() =>
											handleExportCsv(building, fieldLabels, toaster)
										}
									>
										<Icon as={BsFiletypeCsv} size="sm" />
										Exportovať do CSV
									</Menu.Item>
									<Menu.Item
										value="export-pdf"
										px="4"
										py="3"
										gap="3"
										cursor="pointer"
										_hover={{
											bg: 'action.secondaryHover',
										}}
										onClick={() =>
											handleExportPdf(building, fieldLabels, toaster)
										}
									>
										<Icon as={BsFiletypePdf} size="sm" />
										Exportovať do PDF
									</Menu.Item>
								</Menu.Content>
							</Menu.Positioner>
						</Portal>
					</Menu.Root>
				</Box>
			</Flex>
		</Box>
	);
}
