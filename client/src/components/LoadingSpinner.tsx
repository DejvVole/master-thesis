import { Flex, VStack, Spinner, Text } from '@chakra-ui/react';

interface LoadingSpinnerProps {
	text?: string;
}

export default function LoadingSpinner({
	text = 'Načítavam...',
}: LoadingSpinnerProps) {
	return (
		<Flex justify="center" align="center" py="20">
			<VStack gap="4">
				<Spinner
					boxSize="12"
					borderWidth="4px"
					color="action.primary"
					borderTopColor="transparent"
				/>
				<Text color="text.muted" fontWeight="medium">
					{text}
				</Text>
			</VStack>
		</Flex>
	);
}
