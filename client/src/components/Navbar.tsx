import { IoIosArrowDown } from 'react-icons/io';
import { LuLayoutDashboard, LuUsers, LuLogOut } from 'react-icons/lu';
import { FaRegUser } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { signOut, useSession } from '../auth';

import {
	Box,
	Button,
	Flex,
	HStack,
	Icon,
	Menu,
	Portal,
	Text,
} from '@chakra-ui/react';

export function Navbar() {
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === 'admin';

	const handleLogout = async () => {
		await signOut();
		window.location.href = '/login';
	};

	return (
		<Box
			bgColor="bg.surface"
			borderBottom="1px solid"
			borderColor="border.primary"
			py={{ base: '3', md: '4' }}
			px={{ base: '4', sm: '6', md: '10', lg: '14' }}
		>
			<Flex
				justify="space-between"
				align={{ base: 'flex-start', md: 'center' }}
				gap={{ base: '3', md: '6' }}
				flexWrap="wrap"
			>
				<Link to="/">
					<Text
						fontSize={{ base: 'lg', sm: 'xl', md: '2xl' }}
						fontWeight="bold"
						color="text.primary"
						lineHeight="short"
					>
						Prieskumník Historických Budov
					</Text>
				</Link>
				<HStack
					gap={{ base: '2', sm: '4' }}
					w={{ base: 'full', md: 'auto' }}
					justify={{ base: 'space-between', md: 'flex-end' }}
				>
					{session?.user && (
						<>
							<Icon
								as={FaRegUser}
								boxSize="10"
								color="action.primary"
								padding="2"
								backgroundColor="action.secondaryHover"
								borderRadius="md"
								mr="-2"
								display={{ base: 'none', sm: 'block' }}
							/>
							<Menu.Root>
								<Menu.Trigger asChild>
									<Button variant="ghost" size="lg" p="2">
										{isAdmin && 'Admin'} {session.user.name}
										<IoIosArrowDown />
									</Button>
								</Menu.Trigger>
								<Portal>
									<Menu.Positioner>
										<Menu.Content borderRadius="l" shadow="lg" bg="bg.surface">
											{isAdmin && (
												<>
													<Menu.Item
														value="link-to-admin"
														asChild
														fontSize="md"
														cursor="pointer"
														borderRadius="l"
														py="2.5"
														paddingRight="2"
														_hover={{
															bg: 'action.secondaryHover',
														}}
													>
														<Link to="/admin">
															<Icon>
																<LuLayoutDashboard />
															</Icon>
															Administrácia
														</Link>
													</Menu.Item>
													<Menu.Item
														value="link-to-admin-users"
														asChild
														fontSize="md"
														cursor="pointer"
														borderRadius="l"
														py="2.5"
														_hover={{
															bg: 'action.secondaryHover',
														}}
													>
														<Link to="/admin/users">
															<Icon>
																<LuUsers />
															</Icon>
															Používatelia
														</Link>
													</Menu.Item>
												</>
											)}

											<Menu.Item
												value="logout"
												onSelect={handleLogout}
												fontSize="md"
												cursor="pointer"
												borderRadius="l"
												py="2.5"
												_hover={{
													bg: 'action.secondaryHover',
												}}
											>
												<Icon>
													<LuLogOut />
												</Icon>
												Odhlásiť sa
											</Menu.Item>
										</Menu.Content>
									</Menu.Positioner>
								</Portal>
							</Menu.Root>
						</>
					)}
				</HStack>
			</Flex>
		</Box>
	);
}
