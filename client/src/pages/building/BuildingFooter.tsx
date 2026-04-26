import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { FiClock, FiRefreshCw } from 'react-icons/fi';

export default function BuildingFooter({
	createdAt,
	updatedAt,
}: {
	createdAt: string;
	updatedAt: string;
}) {
	return (
		<Box
			px={{ base: '5', md: '10' }}
			py={{ base: '4', md: '6' }}
			bg="action.primary"
			borderTop="1px"
			borderColor="border.default"
		>
			<Flex flexWrap="wrap" gap="6" fontSize="sm" color="action.onPrimary">
				<Flex align="center" gap="2">
					<Icon as={FiClock} boxSize="4" />
					<Text>Vytvorené: {new Date(createdAt).toLocaleString('sk-SK')}</Text>
				</Flex>
				<Flex align="center" gap="2">
					<Icon as={FiRefreshCw} boxSize="4" />
					<Text>
						Aktualizované: {new Date(updatedAt).toLocaleString('sk-SK')}
					</Text>
				</Flex>
			</Flex>
		</Box>
	);
}
