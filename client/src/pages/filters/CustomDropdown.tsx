import { useMemo } from 'react';
import { Portal, Select, createListCollection } from '@chakra-ui/react';

interface DropdownOption {
	value: string;
	label: string;
}

interface CustomDropdownProps {
	value: string;
	onChange: (value: string) => void;
	options: DropdownOption[];
	placeholder?: string;
}

export default function CustomDropdown({
	value,
	onChange,
	options = [],
	placeholder = 'Všetky',
}: CustomDropdownProps) {
	const allOptions = useMemo(
		() => [{ value: '', label: placeholder }, ...options],
		[options, placeholder]
	);

	const collection = useMemo(
		() => createListCollection({ items: allOptions }),
		[allOptions]
	);

	const handleValueChange = (details: { value: string[] }) => {
		onChange(details.value[0] ?? '');
	};

	return (
		<Select.Root
			collection={collection}
			value={value ? [value] : ['']}
			onValueChange={handleValueChange}
		>
			<Select.HiddenSelect />
			<Select.Control>
				<Select.Trigger
					w="full"
					fontSize="sm"
					borderRadius="l"
					borderColor="border.primary"
					_hover={{ borderColor: 'border.strong' }}
					_focus={{ borderColor: 'border.strong' }}
					cursor="pointer"
				>
					<Select.ValueText placeholder={placeholder} />
				</Select.Trigger>
				<Select.IndicatorGroup>
					<Select.Indicator />
				</Select.IndicatorGroup>
			</Select.Control>
			<Portal>
				<Select.Positioner>
					<Select.Content borderRadius="l" shadow="lg" maxH="60">
						{allOptions.map((option) => (
							<Select.Item
								item={option}
								key={option.value}
								px="3"
								py="2"
								fontSize="sm"
								cursor="pointer"
								_hover={{ bg: 'bg.dropdown' }}
								_selected={{ bg: 'bg.dropdown' }}
							>
								{option.label}
								<Select.ItemIndicator />
							</Select.Item>
						))}
					</Select.Content>
				</Select.Positioner>
			</Portal>
		</Select.Root>
	);
}
