import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, getSession } from '../auth';
import {
	Box,
	Button,
	Flex,
	Heading,
	Input,
	Stack,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { PasswordInput } from '../components/ui/password-input';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	const from = location.state?.from?.pathname || '/buildings';

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		const { error } = await signIn.email({
			email,
			password,
		});

		if (error) {
			toaster.error({
				title: 'Nepodarilo sa prihlásiť',
				description:
					'Prosím, skontrolujte svoje prihlasovacie údaje a skúste to znova.',
				closable: true,
			});
			setIsLoading(false);
		} else {
			await getSession();
			navigate(from, { replace: true });
		}
	};

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
				<Stack gap="8">
					<Box textAlign="center">
						<Heading
							as="h2"
							mt="6"
							fontSize="3xl"
							fontWeight="extrabold"
							color="text.primary"
						>
							Prihláste sa
						</Heading>
						<Text mt="2" fontSize="sm" color="text.muted">
							Účet vám musí vytvoriť administrátor
						</Text>
					</Box>

					<Box as="form" onSubmit={handleSubmit} w="full">
						<Stack gap="6">
							<Stack gap="4">
								<Box>
									<VisuallyHidden>
										<label htmlFor="email">Email</label>
									</VisuallyHidden>
									<Input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="Email"
										size="md"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
									/>
								</Box>

								<Box>
									<VisuallyHidden>
										<label htmlFor="password">Heslo</label>
									</VisuallyHidden>
									{/* use password input from chakra ui */}
									<PasswordInput
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Heslo"
										size="md"
										borderColor="border.primary"
										_hover={{ borderColor: 'border.strong' }}
									/>
								</Box>
							</Stack>

							<Button
								type="submit"
								loading={isLoading}
								loadingText="Prihlasujem..."
								w="full"
								py="2.5"
								variant="solid"
								transition="colors 0.2s"
							>
								Prihlásiť sa
							</Button>
						</Stack>
					</Box>
				</Stack>
			</Box>
		</Flex>
	);
}
