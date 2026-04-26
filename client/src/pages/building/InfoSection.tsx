import { Box, Flex, Heading, Icon, VStack } from '@chakra-ui/react';
import type { ElementType, ReactNode } from 'react';

export default function InfoSection({
	title,
	icon,
	children,
}: {
	title: string;
	icon: ElementType;
	children: ReactNode;
}) {
	return (
		<Box
			borderRadius="2xl"
			overflow="hidden"
			_hover={{ shadow: 'lg' }}
			transition="all 0.3s"
		>
			<Box bg="bg.canvas" px="6" py="4">
				<Heading as="h2" fontSize="lg" fontWeight="bold" color="text.primary">
					<Flex align="center" gap="3">
						<Flex
							w="10"
							h="10"
							bg="action.primary"
							borderRadius="xl"
							align="center"
							justify="center"
						>
							<Icon as={icon} boxSize="5" color="action.onPrimary" />
						</Flex>
						{title}
					</Flex>
				</Heading>
			</Box>
			<VStack gap="4" p="6" bg="bg.surface" align="stretch">
				{children}
			</VStack>
		</Box>
	);
}
