import { useState, useEffect } from 'react';
import { admin, useSession } from '../../auth';
import { adminApi, type Invitation } from '../../api/admin';
import { useNavigate } from 'react-router-dom';
import { IoMailOutline } from 'react-icons/io5';
import { Box, Button, Flex, Heading, Icon, Spinner } from '@chakra-ui/react';
import { toaster } from '../../components/ui/toaster';
import { InviteForm } from './components/InviteForm';
import { PendingInvitations } from './components/PendingInvitations';
import { UsersTable, type User } from './components/UsersTable';
import BackLink from '../../components/BackLink';

export function UserManagement() {
	const [users, setUsers] = useState<User[]>([]);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showInviteForm, setShowInviteForm] = useState(false);

	const { data: session } = useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (session && session.user.role !== 'admin') {
			navigate('/');
		}
	}, [session, navigate]);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const [usersResult, invitationsData] = await Promise.all([
				admin.listUsers({ query: { limit: 100 } }),
				adminApi.getInvitations(),
			]);

			if (usersResult.data) {
				setUsers(usersResult.data.users as User[]);
			}
			setInvitations(invitationsData);
		} catch (err) {
			toaster.error({
				title: 'Chyba pri načítavaní dát',
				closable: true,
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleSendInvitation = async (
		email: string,
		role: 'user' | 'admin'
	) => {
		try {
			const result = await adminApi.sendInvitation(email, role);
			if (result.success) {
				toaster.success({
					title: 'Pozvánka bola odoslaná',
					description: `Pozvánka bola odoslaná na ${email}`,
					closable: true,
				});
				setShowInviteForm(false);
				fetchData();
			}
		} catch (err: any) {
			const errorMessage = err?.response?.data?.error;

			if (
				typeof errorMessage === 'string' &&
				errorMessage.includes('Používateľ s týmto emailom už existuje')
			) {
				toaster.warning({
					title: 'Používateľ s týmto emailom už existuje',
					description: 'Pozvánku nie je možné odoslať na existujúci účet.',
					closable: true,
				});
				return;
			}

			toaster.error({
				title: 'Chyba pri odosielaní pozvánky',
				description:
					typeof errorMessage === 'string' && errorMessage.length > 0
						? errorMessage
						: 'Niečo sa pokazilo',
				closable: true,
			});
		}
	};

	const handleDeleteInvitation = async (id: string) => {
		try {
			await adminApi.deleteInvitation(id);
			toaster.success({
				title: 'Pozvánka bola zmazaná',
				closable: true,
			});
			fetchData();
		} catch (err) {
			toaster.error({
				title: 'Chyba pri mazaní pozvánky',
				closable: true,
			});
		}
	};

	const handleRoleChange = async (
		userId: string,
		newRole: 'user' | 'admin'
	) => {
		try {
			await admin.setRole({ userId, role: newRole });
			fetchData();
			toaster.success({
				title: 'Rola používateľa bola zmenená',
				closable: true,
			});
		} catch (err) {
			toaster.error({
				title: 'Chyba pri zmene role používateľa',
				closable: true,
			});
		}
	};

	const handleBan = async (user: User, reason?: string) => {
		try {
			await admin.banUser({
				userId: user.id,
				banReason: reason || undefined,
			});
			toaster.success({
				title: `Používateľ ${user.name} bol zablokovaný`,
				closable: true,
			});
			fetchData();
		} catch (err) {
			toaster.error({
				title: 'Chyba pri zablokovaní používateľa',
				closable: true,
			});
		}
	};

	const handleUnban = async (user: User) => {
		try {
			await admin.unbanUser({ userId: user.id });
			toaster.success({
				title: `Používateľ ${user.name} bol odblokovaný`,
				closable: true,
			});
			fetchData();
		} catch (err) {
			toaster.error({
				title: 'Chyba pri odblokovaní používateľa',
				closable: true,
			});
		}
	};

	const handleDeleteUser = async (userId: string) => {
		try {
			await admin.removeUser({ userId });
			toaster.success({
				title: 'Používateľ bol zmazaný',
				closable: true,
			});
			fetchData();
		} catch (err) {
			toaster.error({
				title: 'Chyba pri mazaní používateľa',
				closable: true,
			});
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('sk-SK', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

	const pendingInvitations = invitations.filter(
		(inv) => !inv.acceptedAt && !isExpired(inv.expiresAt)
	);

	if (isLoading) {
		return (
			<>
				<Flex minH="100vh" align="center" justify="center">
					<Spinner size="xl" color="action.primary" borderWidth="2px" />
				</Flex>
			</>
		);
	}

	return (
		<Box
			minH="100vh"
			bg="bg.canvas"
			py="8"
			px={{ base: '4', sm: '6', lg: '8' }}
		>
			<Box maxW="6xl" mx="auto">
				<Flex
					justify="space-between"
					align={{ base: 'flex-start', md: 'center' }}
					mb="8"
					gap={{ base: '3', md: '6' }}
					flexWrap="wrap"
				>
					<Heading
						as="h1"
						size={{ base: 'xl', md: '2xl' }}
						fontWeight="bold"
						color="text.primary"
					>
						Správa používateľov
					</Heading>
					<Flex align="center" gap="4" flexWrap="wrap">
						<BackLink />
						<Button variant="solid" onClick={() => setShowInviteForm(true)}>
							<Icon as={IoMailOutline} boxSize="5" />
							Pozvať používateľa
						</Button>
					</Flex>
				</Flex>

				{showInviteForm && (
					<InviteForm
						onSubmit={handleSendInvitation}
						onClose={() => setShowInviteForm(false)}
					/>
				)}

				<PendingInvitations
					invitations={pendingInvitations}
					onDelete={handleDeleteInvitation}
					formatDate={formatDate}
				/>

				<UsersTable
					users={users}
					currentUserId={session?.user.id}
					onRoleChange={handleRoleChange}
					onBan={handleBan}
					onUnban={handleUnban}
					onDelete={handleDeleteUser}
				/>
			</Box>
		</Box>
	);
}
