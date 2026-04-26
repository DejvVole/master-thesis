import { Box, Flex, Text } from '@chakra-ui/react';

export function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
}) {
	return (
		<Box
			bg="bg.surface"
			borderRadius="2xl"
			p="6"
			border="1px"
			borderColor="border.default"
			shadow="sm"
			_hover={{ borderColor: 'action.primary', shadow: 'xl' }}
			transition="all 0.3s"
		>
			<Flex align="center" justify="space-between">
				<Box>
					<Text fontSize="sm" fontWeight="medium" color="text.muted">
						{label}
					</Text>
					<Text fontSize="3xl" fontWeight="bold" color="text.primary" mt="2">
						{value}
					</Text>
				</Box>
				<Flex h="12" w="12" borderRadius="xl" align="center" justify="center">
					{icon}
				</Flex>
			</Flex>
		</Box>
	);
}
