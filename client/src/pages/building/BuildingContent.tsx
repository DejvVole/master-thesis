import { Box, Grid, Icon, Text } from '@chakra-ui/react';
import type { ElementType } from 'react';
import {
	BsBuilding,
	BsClock,
	BsBox,
	BsCheckCircle,
	BsGear,
	BsFileText,
	BsShield,
	BsDisplay,
	BsDroplet,
	BsCurrencyDollar,
} from 'react-icons/bs';

import InfoItem from './InfoItem';
import InfoSection from './InfoSection';
import { FiFileText } from 'react-icons/fi';

const categoryConfig: Record<string, { icon: ElementType }> = {
	základné: {
		icon: BsBuilding,
	},
	história: {
		icon: BsClock,
	},
	materiály: {
		icon: BsBox,
	},
	stav: {
		icon: BsCheckCircle,
	},
	údržba: {
		icon: BsGear,
	},
	dokumentácia: {
		icon: BsFileText,
	},
	legislatíva: {
		icon: BsShield,
	},
	digitálne: {
		icon: BsDisplay,
	},
	výskum: {
		icon: BsDroplet,
	},
	náklady: {
		icon: BsCurrencyDollar,
	},
};

export const categoryNames: Record<string, string> = {
	základné: 'Základné informácie',
	história: 'História a význam',
	materiály: 'Materiály a konštrukcia',
	stav: 'Stav budovy',
	údržba: 'Údržba a sanácie',
	dokumentácia: 'Dokumentácia',
	legislatíva: 'Legislatíva a ochrana',
	digitálne: 'Digitálne dáta',
	výskum: 'Výskum a analýzy',
	náklady: 'Náklady',
};

export default function BuildingContent({
	groupedFields,
}: {
	groupedFields: Record<
		string,
		{ label: string; value: string | null; key: string }[]
	>;
}) {
	return (
		<Box p={{ base: '5', md: '10' }}>
			{Object.keys(groupedFields).length > 0 ? (
				<Grid gap="6">
					{Object.entries(categoryConfig).map(([categoryKey, config]) => {
						const fields = groupedFields[categoryKey];
						if (!fields || fields.length === 0) return null;

						return (
							<InfoSection
								key={categoryKey}
								title={categoryNames[categoryKey]}
								icon={config.icon}
							>
								{fields.map((field) => (
									<InfoItem
										key={field.key}
										label={field.label}
										value={field.value}
									/>
								))}
							</InfoSection>
						);
					})}
				</Grid>
			) : (
				<Box textAlign="center" py="12" color="text.subtle">
					<Icon
						as={FiFileText}
						boxSize="16"
						mx="auto"
						mb="4"
						color="text.subtle"
					/>
					<Text fontSize="lg" fontWeight="medium">
						Žiadne údaje nie sú k dispozícii
					</Text>
					<Text fontSize="sm" mt="1">
						Pre túto budovu zatiaľ neboli extrahované žiadne informácie.
					</Text>
				</Box>
			)}
		</Box>
	);
}
