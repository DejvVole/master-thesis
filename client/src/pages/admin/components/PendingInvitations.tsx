import { IoTimeOutline, IoTrashOutline } from 'react-icons/io5';
import {
	Badge,
	Box,
	Flex,
	Heading,
	HStack,
	Icon,
	IconButton,
	Text,
	VStack,
} from '@chakra-ui/react';
import type { Invitation } from '../../../api/admin';

interface PendingInvitationsProps {
	invitations: Invitation[];
	onDelete: (id: string) => Promise<void>;
	formatDate: (dateString: string) => string;
}

export function PendingInvitations({
	invitations,
	onDelete,
	formatDate,
}: PendingInvitationsProps) {
	if (invitations.length === 0) return null;

	return (
		<Box mb="8">
			<Heading
				as="h2"
				size="md"
				color="text.primary"
				mb="4"
				display="flex"
				alignItems="center"
				gap="2"
			>
				<Icon as={IoTimeOutline} boxSize="5" color="amber.500" />
				Čakajúce pozvánky ({invitations.length})
			</Heading>
			<Box bg="bg.surface" shadow="sm" borderRadius="xl">
				<VStack divideY="1px" gap="0">
					{invitations.map((invitation) => (
						<Flex
							key={invitation.id}
							px={{ base: '4', md: '6' }}
							py="4"
							w="full"
							direction={{ base: 'column', sm: 'row' }}
							gap={{ base: '3', sm: '0' }}
							align={{ base: 'flex-start', sm: 'center' }}
						>
							<Box flex="1">
								<HStack gap="3" flexWrap="wrap">
									<Text fontWeight="medium" color="text.primary">
										{invitation.email}
									</Text>
									<Badge
										px="2"
										py="0.5"
										fontSize="xs"
										borderRadius="full"
										bg={invitation.role === 'admin' ? 'purple.100' : 'gray.100'}
										color={
											invitation.role === 'admin' ? 'purple.700' : 'gray.600'
										}
									>
										{invitation.role === 'admin'
											? 'Administrátor'
											: 'Používateľ'}
									</Badge>
								</HStack>
								<Text fontSize="sm" color="text.subtle" mt="1">
									Odoslaná: {formatDate(invitation.createdAt)}
								</Text>
							</Box>
							<IconButton
								variant="ghost"
								color="red.500"
								_hover={{ color: 'red.700', bg: 'red.50' }}
								borderRadius="lg"
								onClick={() => onDelete(invitation.id)}
								title="Zmazať pozvánku"
							>
								<Icon as={IoTrashOutline} boxSize="5" />
							</IconButton>
						</Flex>
					))}
				</VStack>
			</Box>
		</Box>
	);
}
