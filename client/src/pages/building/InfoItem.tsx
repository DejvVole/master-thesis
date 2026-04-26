import { Flex, Text } from '@chakra-ui/react';

export default function InfoItem({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	if (!value) return null;

	const isLongValue = value.length > 100;

	return (
		<Flex
			direction={isLongValue ? 'column' : { base: 'column', sm: 'row' }}
			gap="2"
			align={
				isLongValue ? 'flex-start' : { base: 'flex-start', sm: 'baseline' }
			}
			role="group"
		>
			<Text
				fontWeight="semibold"
				color="text.primary"
				minW={{ base: 'auto', sm: '180px' }}
				flexShrink="0"
			>
				{label}
			</Text>
			<Text color="text.muted" lineHeight="relaxed">
				{value}
			</Text>
		</Flex>
	);
}
