import { useState } from 'react';
import { Button, Dialog, Field, Input, Portal, Stack } from '@chakra-ui/react';

interface BanDialogProps {
	userName: string;
	onConfirm: (reason: string) => void;
	trigger: React.ReactNode;
}

export function BanDialog({ userName, onConfirm, trigger }: BanDialogProps) {
	const [reason, setReason] = useState('');
	const [open, setOpen] = useState(false);

	const handleConfirm = () => {
		onConfirm(reason);
		setReason('');
		setOpen(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={({ open }) => setOpen(open)}>
			<Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
			<Portal>
				<Dialog.Backdrop />
				<Dialog.Positioner>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Zablokovať používateľa</Dialog.Title>
							<Dialog.Description>
								Naozaj chcete zablokovať používateľa {userName}?
							</Dialog.Description>
						</Dialog.Header>
						<Dialog.Body pb="4">
							<Stack gap="4">
								<Field.Root>
									<Field.Label>Dôvod zablokovania</Field.Label>
									<Input
										placeholder="Zadajte dôvod zablokovania"
										value={reason}
										onChange={(e) => setReason(e.target.value)}
									/>
								</Field.Root>
							</Stack>
						</Dialog.Body>
						<Dialog.Footer>
							<Dialog.ActionTrigger asChild>
								<Button variant="outline">Zrušiť</Button>
							</Dialog.ActionTrigger>
							<Button
								onClick={handleConfirm}
								variant="solid"
								colorPalette="red"
							>
								Zablokovať
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Positioner>
			</Portal>
		</Dialog.Root>
	);
}
