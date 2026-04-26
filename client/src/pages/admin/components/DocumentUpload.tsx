import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
	buildingsApi,
	type UploadProgress as UploadProgressType,
} from '../../../api/buildings';
import { IoCloudUploadOutline, IoTrashOutline } from 'react-icons/io5';
import {
	Box,
	Button,
	Checkbox,
	Flex,
	Heading,
	Icon,
	Stack,
	Text,
} from '@chakra-ui/react';
import UploadProgress from './DocumentUploadProgress';
import { toaster } from '../../../components/ui/toaster';

export default function DocumentUpload({ onUpload }: { onUpload: () => void }) {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [enableInference, setEnableInference] = useState(false);
	const [progress, setProgress] = useState<UploadProgressType | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		handleFileChange(acceptedFiles);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

	const handleUpload = async () => {
		if (!file) {
			toaster.warning({
				title: 'Žiadny súbor na nahranie',
				description: 'Prosím, vyberte súbor pred nahrávaním.',
				closable: true,
			});
			return;
		}

		setUploading(true);
		setProgress({
			status: 'pending',
			progress: 0,
			message: 'Pripravujem nahrávanie...',
		});

		try {
			const response = await buildingsApi.uploadDocument(file, enableInference);

			if (!response.sessionId) {
				throw new Error('No session ID received');
			}

			sessionIdRef.current = response.sessionId;

			const unsubscribe = buildingsApi.subscribeToProgress(
				response.sessionId,
				(progressData) => {
					setProgress(progressData);

					if (progressData.status === 'complete') {
						unsubscribeRef.current = null;
						setFile(null);
						setEnableInference(false);
						setUploading(false);
						onUpload();
						toaster.success({
							title: 'Dokument bol úspešne nahraný a spracovaný!',
							closable: true,
						});
						setProgress(null);
					} else if (progressData.status === 'error') {
						unsubscribeRef.current = null;
						toaster.error({
							title: 'Chyba pri spracovaní dokumentu',
							description: 'Nastala neznáma chyba.',
							closable: true,
						});
						setUploading(false);
					}
				},
				() => {
					unsubscribeRef.current = null;
					toaster.error({
						title: 'Chyba pri spracovaní dokumentu',
						description: 'Nastala neznáma chyba.',
						closable: true,
					});
					setUploading(false);
				}
			);

			unsubscribeRef.current = unsubscribe;
		} catch (err: any) {
			if (err.response?.status === 409) {
				const data = err.response?.data;
				const existingFileName = data?.existingDocument?.fileName;
				const detail = data?.detail;

				toaster.warning({
					title: 'Dokument s rovnakým obsahom už existuje',
					description:
						detail ||
						(existingFileName
							? `Pôvodný súbor: "${existingFileName}"`
							: 'Nahrajte prosím iný dokument.'),
					closable: true,
				});
			} else {
				toaster.error({
					title: 'Chyba pri nahrávaní dokumentu',
					description: 'Nastala neznáma chyba.',
					closable: true,
				});
			}
			setUploading(false);
			setProgress(null);
		}
	};

	const handleFileChange = (files: File[]) => {
		if (files && files[0]) {
			const selectedFile = files[0];
			const allowedTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			];

			if (!allowedTypes.includes(selectedFile.type)) {
				toaster.warning({
					title: 'Nepodporovaný formát súboru',
					description: 'Podporované sú len formáty PDF, DOC a DOCX',
					closable: true,
				});
				return;
			}

			setFile(selectedFile);
			setProgress(null);
		}
	};

	const handleCancel = async () => {
		// Kill the Python process on the server first
		if (sessionIdRef.current) {
			try {
				await buildingsApi.cancelUpload(sessionIdRef.current);
			} catch {
				// Ignore — process may have already finished
			}
			sessionIdRef.current = null;
		}
		if (unsubscribeRef.current) {
			unsubscribeRef.current();
			unsubscribeRef.current = null;
		}
		setFile(null);
		setUploading(false);
		setProgress(null);
	};

	return (
		<Box
			bg="bg.surface"
			borderRadius="2xl"
			shadow="sm"
			border="1px"
			borderColor="border.default"
			p="8"
			mb="6"
		>
			<Heading
				as="h2"
				fontSize="xl"
				fontWeight="bold"
				color="text.primary"
				mb="6"
			>
				Nahrať nový dokument
			</Heading>

			{/* Show progress when uploading */}
			{uploading && progress ? (
				<Box mb="6">
					<UploadProgress
						progress={progress.progress}
						message={progress.message}
						detail={progress.detail}
						stage={progress.stage}
						currentCategory={progress.currentCategory}
						totalCategories={progress.totalCategories}
						status={progress.status}
						error={progress.error}
					/>

					{progress.status === 'processing' && (
						<Button
							onClick={handleCancel}
							mt="4"
							w="full"
							py="3"
							variant="outline"
							borderRadius="xl"
						>
							Zrušiť
						</Button>
					)}
				</Box>
			) : (
				<>
					{/* Dropzone */}
					<Box mb="6" {...getRootProps()} cursor="pointer">
						<input {...getInputProps()} />
						{isDragActive ? (
							<Box
								p="8"
								border="2px dashed"
								borderRadius="xl"
								textAlign="center"
								fontWeight="medium"
							>
								Pustite súbory sem ...
							</Box>
						) : (
							<Box
								p="8"
								border="2px dashed"
								borderRadius="xl"
								color="text.subtle"
								transition="all 0.2s"
								borderColor="border.primary"
								_hover={{ borderColor: 'border.strong' }}
								_focus={{ borderColor: 'border.strong' }}
							>
								<Flex mb="4" justify="center">
									<Icon as={IoCloudUploadOutline} boxSize="6" />
								</Flex>
								<Flex flexDirection="column" align="center" gap="1">
									<Text>Pretiahnte súbor sem, alebo kliknite pre výber</Text>
									<Text>.pdf, .doc, .docx</Text>
								</Flex>
							</Box>
						)}
					</Box>

					{/* Selected file info */}
					{file && (
						<Box mb="6" p="4">
							<Flex align="center" color="text.primary" gap="1" minW="0">
								<Text
									fontSize={{ base: 'xs', md: 'sm' }}
									overflow="hidden"
									textOverflow="ellipsis"
									whiteSpace="nowrap"
									minW="0"
									flex="1"
								>
									Vybrané: <Text as="strong">{file.name}</Text>
								</Text>
								<Button
									onClick={() => setFile(null)}
									variant="ghost"
									color="red"
									size="sm"
									p="0.5"
									borderRadius="lg"
									flexShrink={0}
									_hover={{ color: 'red.700', bg: 'red.50' }}
								>
									<Icon
										as={IoTrashOutline}
										boxSize={{ base: '3.5', md: '4' }}
									/>
								</Button>
							</Flex>
							<Text
								fontSize={{ base: 'xs', md: 'sm' }}
								color="text.subtle"
								mt="1"
							>
								Veľkosť: {(file.size / 1024 / 1024).toFixed(2)} MB
							</Text>
						</Box>
					)}

					{/* Inference checkbox */}
					<Box p="5" mb="6">
						<Flex align="flex-start" w="full">
							<Checkbox.Root
								id="enableInference"
								checked={enableInference}
								onCheckedChange={(e) => setEnableInference(!!e.checked)}
								mt="1"
							>
								<Checkbox.HiddenInput />
								<Checkbox.Control
									cursor="pointer"
									borderColor="border.primary"
									_hover={{ borderColor: 'border.strong' }}
									_checked={{
										bg: 'border.action',
										color: 'white',
										outline: 'none',
										borderColor: 'transparent',
									}}
								/>
								<Stack gap="2" ml="3" cursor="pointer">
									<Checkbox.Label fontSize="md" fontWeight="semibold">
										Povoliť AI Inferenciu
									</Checkbox.Label>
									<Box textStyle="sm" color="fg.muted">
										LLM sa pokúsi odhadnúť chýbajúce informácie na základe
										kontextu budovy. Odhadnuté hodnoty budú označené ako
										"ODVODENÉ" s úrovňou istoty.
									</Box>
								</Stack>
							</Checkbox.Root>
						</Flex>
					</Box>

					{/* Upload button */}
					<Button
						onClick={handleUpload}
						disabled={!file || uploading}
						loadingText="Nahrávam..."
						w="full"
						variant="solid"
					>
						Nahrať a spracovať
					</Button>
				</>
			)}
		</Box>
	);
}
