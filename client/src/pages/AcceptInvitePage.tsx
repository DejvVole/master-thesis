import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invitationApi } from '../api/admin';
import {
	Box,
	Button,
	Flex,
	Heading,
	Icon,
	Input,
	Stack,
	Text,
	VStack,
} from '@chakra-ui/react';
import { FiX, FiCheck } from 'react-icons/fi';
import { toaster } from '../components/ui/toaster';
import { PasswordInput } from '../components/ui/password-input';
import LoadingSpinner from '../components/LoadingSpinner';

export function AcceptInvitePage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');
	const navigate = useNavigate();

	const [isVerifying, setIsVerifying] = useState(true);
	const [isValid, setIsValid] = useState(false);
	const [email, setEmail] = useState('');

	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		const verifyToken = async () => {
			if (!token) {
				toaster.error({
					title: 'Chýba token pozvánky',
					closable: true,
				});
				setIsVerifying(false);
				return;
			}

			const result = await invitationApi.verify(token);

			if (result.valid && result.email) {
				setIsValid(true);
				setEmail(result.email);
			} else {
				toaster.error({
					title: 'Neplatný alebo expirovaný token pozvánky',
					closable: true,
				});
				setIsValid(false);
			}

			setIsVerifying(false);
		};

		verifyToken();
	}, [token]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			toaster.warning({
				title: 'Heslá sa nezhodujú',
				closable: true,
			});
			return;
		}

		if (password.length < 8) {
			toaster.warning({
				title: 'Heslo musí mať aspoň 8 znakov',
				closable: true,
			});
			return;
		}

		setIsSubmitting(true);

		const result = await invitationApi.accept(token!, name, password);

		if (result.success) {
			setSuccess(true);
			setTimeout(() => {
				navigate('/login');
			}, 3000);
		} else {
			toaster.error({
				title: 'Nepodarilo sa vytvoriť účet',
				description: 'Skúste to prosím znova.',
				closable: true,
			});
		}

		setIsSubmitting(false);
	};

	// Loading state
	if (isVerifying) {
		return <LoadingSpinner text="Overujem pozvánku..." />;
	}

	if (!isValid && !success) {
		return (
			<Flex
				minH="100vh"
				align="center"
				justify="center"
				bg="bg.canvas"
				py="12"
				px={{ base: '4', sm: '6', lg: '8' }}
			>
				<Box maxW="md" w="full">
					<Box
						bg="bg.surface"
						p="8"
						borderRadius="2xl"
						shadow="lg"
						textAlign="center"
					>
						<Icon
							as={FiX}
							boxSize="12"
							color="action.primary"
							padding="2"
							backgroundColor="action.secondaryHover"
							borderRadius="full"
							mb="4"
						/>
						<Heading
							as="h2"
							fontSize="2xl"
							fontWeight="bold"
							color="text.primary"
							mb="2"
						>
							Neplatná pozvánka
						</Heading>
						<Button onClick={() => navigate('/login')} variant="solid">
							Späť na prihlásenie
						</Button>
					</Box>
				</Box>
			</Flex>
		);
	}

	// Success state
	if (success) {
		return (
			<Flex
				minH="100vh"
				align="center"
				justify="center"
				bg="bg.canvas"
				py="12"
				px={{ base: '4', sm: '6', lg: '8' }}
			>
				<Box maxW="md" w="full">
					<Box
						bg="bg.surface"
						p="8"
						borderRadius="2xl"
						shadow="lg"
						textAlign="center"
					>
						<Icon
							as={FiCheck}
							color="action.primary"
							boxSize="12"
							padding="2"
							backgroundColor="action.secondaryHover"
							borderRadius="full"
							mb="4"
						/>

						<Heading
							as="h2"
							fontSize="2xl"
							fontWeight="bold"
							color="text.primary"
							mb="2"
						>
							Účet bol vytvorený!
						</Heading>
						<Text color="text.muted" mb="4">
							Váš účet bol úspešne vytvorený. Budete presmerovaný na
							prihlasovacíu stránku...
						</Text>
						<Text color="action.primary" animation="pulse 2s infinite">
							Presmerovanie za 3 sekundy...
						</Text>
					</Box>
				</Box>
			</Flex>
		);
	}

	// Registration form
	return (
		<Flex
			minH="100vh"
			align="center"
			justify="center"
			bg="bg.canvas"
			py="12"
			px={{ base: '4', sm: '6', lg: '8' }}
		>
			<Box maxW="md" w="full">
				<VStack gap="8">
					<Box textAlign="center">
						<Heading
							as="h2"
							mt="6"
							fontSize="3xl"
							fontWeight="extrabold"
							color="text.primary"
						>
							Dokončite registráciu
						</Heading>
						<Text mt="2" fontSize="sm" color="text.muted">
							Boli ste pozvaní ako{' '}
							<Text as="span" fontWeight="medium" color="action.primary">
								{email}
							</Text>
						</Text>
					</Box>

					<Box as="form" onSubmit={handleSubmit} w="full">
						<Stack gap="6">
							<Stack gap="4">
								<Box>
									<Text
										display="block"
										fontSize="sm"
										fontWeight="medium"
										color="text.primary"
										mb="1"
									>
										Meno
									</Text>
									<Input
										id="name"
										name="name"
										type="text"
										required
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Vaše meno"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
									/>
								</Box>

								<Box>
									<Text
										display="block"
										fontSize="sm"
										fontWeight="medium"
										color="text.primary"
										mb="1"
									>
										Email
									</Text>
									<Input
										id="email"
										name="email"
										type="email"
										disabled
										value={email}
										cursor="not-allowed"
										borderColor="border.primary"
									/>
								</Box>

								<Box>
									<Text
										display="block"
										fontSize="sm"
										fontWeight="medium"
										color="text.primary"
										mb="1"
									>
										Heslo
									</Text>
									<PasswordInput
										id="password"
										name="password"
										type="password"
										required
										minLength={8}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Minimálne 8 znakov"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
									/>
								</Box>

								<Box>
									<Text
										display="block"
										fontSize="sm"
										fontWeight="medium"
										color="text.primary"
										mb="1"
									>
										Potvrdenie hesla
									</Text>
									<PasswordInput
										id="confirmPassword"
										name="confirmPassword"
										type="password"
										required
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder="Zopakujte heslo"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
									/>
								</Box>
							</Stack>

							<Button
								type="submit"
								loading={isSubmitting}
								loadingText="Vytváranie účtu..."
								w="full"
								variant="solid"
								transition="colors 0.2s"
							>
								Vytvoriť účet
							</Button>
						</Stack>
					</Box>
				</VStack>
			</Box>
		</Flex>
	);
}
