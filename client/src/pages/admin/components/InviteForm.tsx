import React, { useState } from 'react';
import { IoMailOutline, IoClose } from 'react-icons/io5';
import {
	Box,
	Button,
	Flex,
	Grid,
	Heading,
	HStack,
	Icon,
	IconButton,
	Input,
	SegmentGroup,
	Spinner,
	Text,
	VStack,
} from '@chakra-ui/react';

interface InviteFormProps {
	onSubmit: (email: string, role: 'user' | 'admin') => Promise<void>;
	onClose: () => void;
}

export function InviteForm({ onSubmit, onClose }: InviteFormProps) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<'user' | 'admin'>('user');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			await onSubmit(email, role);
			setEmail('');
			setRole('user');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Box
			mb="8"
			bg="bg.surface"
			p="6"
			borderRadius="xl"
			shadow="sm"
			border="1px"
			borderColor="border.default"
		>
			<Flex
				justify="space-between"
				align={{ base: 'flex-start', sm: 'center' }}
				mb="4"
				gap="3"
				flexWrap="wrap"
			>
				<Heading as="h2" size="lg" fontWeight="semibold" color="text.primary">
					Pozvať nového používateľa
				</Heading>
				<IconButton
					variant="ghost"
					color="text.subtle"
					_hover={{ color: 'text.muted' }}
					onClick={onClose}
				>
					<Icon as={IoClose} boxSize="6" />
				</IconButton>
			</Flex>
			<Text color="text.muted" mb="4">
				Zadajte emailovú adresu používateľa. Na túto adresu bude odoslaná
				pozvánka s odkazom na registráciu.
			</Text>
			<form onSubmit={handleSubmit}>
				<VStack gap="4" align="stretch">
					<Grid
						gridTemplateColumns={{ base: '1fr', md: '2fr 1fr' }}
						gap={{ base: '4', md: '10' }}
					>
						<Box>
							<Text
								as="label"
								display="block"
								fontSize="sm"
								fontWeight="medium"
								color="text.primary"
								mb="1"
							>
								Email
							</Text>
							<Input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="email@example.com"
							/>
						</Box>
						<Box>
							<Text
								as="label"
								display="block"
								fontSize="sm"
								fontWeight="medium"
								color="text.primary"
								mb="1"
							>
								Rola
							</Text>
							<SegmentGroup.Root
								defaultValue="user"
								css={{
									'--segment-indicator-bg': '#6FA8A1',
									'--segment-indicator-shadow': 'shadows.md',
								}}
								onValueChange={({ value }) =>
									setRole(value as 'user' | 'admin')
								}
							>
								<SegmentGroup.Indicator />
								<SegmentGroup.Items
									cursor="pointer"
									_checked={{ color: 'white' }}
									items={[
										{ value: 'admin', label: 'Admin' },
										{ value: 'user', label: 'User' },
									]}
								/>
							</SegmentGroup.Root>
						</Box>
					</Grid>
					<HStack gap="2" flexWrap="wrap">
						<Button
							type="submit"
							variant="solid"
							disabled={isLoading}
							display="flex"
							alignItems="center"
							gap="2"
						>
							{isLoading ? (
								<>
									<Spinner size="sm" />
									Odosielam...
								</>
							) : (
								<>
									<Icon as={IoMailOutline} boxSize="4" />
									Odoslať pozvánku
								</>
							)}
						</Button>
						<Button type="button" variant="outline" onClick={onClose}>
							Zrušiť
						</Button>
					</HStack>
				</VStack>
			</form>
		</Box>
	);
}
