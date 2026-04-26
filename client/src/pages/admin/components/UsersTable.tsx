import {
	Badge,
	Box,
	Button,
	createListCollection,
	Heading,
	HStack,
	Portal,
	Select,
	Table,
	Text,
} from '@chakra-ui/react';
import { BanDialog } from './BanDialog';

export interface User {
	id: string;
	name: string;
	email: string;
	role: 'user' | 'admin';
	banned: boolean;
	banReason?: string | null;
	createdAt: string;
}

interface UsersTableProps {
	users: User[];
	currentUserId?: string;
	onRoleChange: (userId: string, newRole: 'user' | 'admin') => Promise<void>;
	onBan: (user: User, reason?: string) => Promise<void>;
	onUnban: (user: User) => Promise<void>;
	onDelete: (userId: string) => Promise<void>;
}

const headerCells = ['Používateľ', 'Email', 'Rola', 'Stav', 'Vytvorený', ''];

export function UsersTable({
	users,
	currentUserId,
	onRoleChange,
	onBan,
	onUnban,
	onDelete,
}: UsersTableProps) {
	const roles = createListCollection({
		items: [
			{ label: 'User', value: 'user' },
			{ label: 'Admin', value: 'admin' },
		],
	});

	return (
		<>
			<Heading
				as="h2"
				size="md"
				fontWeight="semibold"
				color="text.primary"
				mb="4"
			>
				Registrovaní používatelia ({users.length})
			</Heading>
			<Box shadow="sm" borderRadius="xl" overflow="hidden" overflowX="auto">
				<Table.Root size="sm">
					<Table.Header>
						<Table.Row>
							{headerCells.map((header) => (
								<Table.ColumnHeader
									key={header}
									px="6"
									py="3"
									textAlign="left"
									fontSize="xs"
									fontWeight="bold"
									textTransform="uppercase"
									letterSpacing="wider"
								>
									{header}
								</Table.ColumnHeader>
							))}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{users.map((user) => (
							<Table.Row key={user.id}>
								<Table.Cell px="6" py="4" whiteSpace="nowrap">
									<Text fontWeight="medium">{user.name}</Text>
								</Table.Cell>
								<Table.Cell px="6" py="4" whiteSpace="nowrap">
									<Text color="text.subtle">{user.email}</Text>
								</Table.Cell>
								<Table.Cell px="6" py="4" whiteSpace="nowrap">
									<Select.Root
										collection={roles}
										value={user.role ? [user.role] : []}
										onValueChange={(e) =>
											onRoleChange(user.id, e.value[0] as 'user' | 'admin')
										}
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
												disabled={user.id === currentUserId}
											>
												<Select.ValueText placeholder={user.role} />
											</Select.Trigger>
											<Select.IndicatorGroup>
												<Select.Indicator />
											</Select.IndicatorGroup>
										</Select.Control>
										<Portal>
											<Select.Positioner>
												<Select.Content borderRadius="l" shadow="lg" maxH="60">
													{roles.items.map((option) => (
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
								</Table.Cell>
								<Table.Cell px="6" py="4" whiteSpace="nowrap">
									{user.banned ? (
										<Badge
											py="2"
											fontWeight="semibold"
											borderRadius="xl"
											bg="red.100"
											color="red.800"
										>
											Zablokovaný
											{user.banReason && ` - ${user.banReason}`}
										</Badge>
									) : (
										<Badge
											py="1"
											fontWeight="semibold"
											borderRadius="xl"
											bg="green.100"
											color="green.800"
										>
											Aktívny
										</Badge>
									)}
								</Table.Cell>
								<Table.Cell
									px="6"
									py="4"
									whiteSpace="nowrap"
									color="text.subtle"
								>
									{new Date(user.createdAt).toLocaleDateString('sk-SK')}
								</Table.Cell>
								<Table.Cell
									px="6"
									py="4"
									whiteSpace="nowrap"
									textAlign="right"
									fontSize="sm"
									fontWeight="medium"
								>
									<HStack gap="2">
										{user.banned ? (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onUnban(user)}
												disabled={user.id === currentUserId}
												color="yellow.600"
												_hover={{ color: 'yellow.900' }}
												_disabled={{ opacity: 0.5 }}
											>
												Odblokovať
											</Button>
										) : (
											<BanDialog
												userName={user.name}
												onConfirm={(reason) => onBan(user, reason)}
												trigger={
													<Button
														variant="ghost"
														size="sm"
														disabled={user.id === currentUserId}
														color="orange.600"
														_hover={{ color: 'orange.900' }}
														_disabled={{ opacity: 0.5 }}
													>
														Zablokovať
													</Button>
												}
											/>
										)}
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDelete(user.id)}
											disabled={user.id === currentUserId}
											color="red.600"
											_hover={{ color: 'red.900' }}
											_disabled={{ opacity: 0.5 }}
										>
											Vymazať
										</Button>
									</HStack>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>

				{users.length === 0 && (
					<Box textAlign="center" py="8">
						<Text color="text.subtle">Žiadni používatelia</Text>
					</Box>
				)}
			</Box>
		</>
	);
}
