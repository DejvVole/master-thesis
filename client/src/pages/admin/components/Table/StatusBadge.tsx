import { Badge } from '@chakra-ui/react';

interface StatusBadgeProps {
	enabled: boolean;
	enabledLabel: string;
	disabledLabel: string;
}

export default function StatusBadge({
	enabled,
	enabledLabel,
	disabledLabel,
}: StatusBadgeProps) {
	return (
		<Badge
			display="inline-flex"
			px="3"
			py="1"
			fontSize="sm"
			fontWeight="medium"
			borderRadius="xl"
			bg={enabled ? 'green.100' : 'gray.100'}
			color={enabled ? 'green.800' : 'gray.700'}
		>
			{enabled ? enabledLabel : disabledLabel}
		</Badge>
	);
}
