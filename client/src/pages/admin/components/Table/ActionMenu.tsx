import { HiDotsVertical } from 'react-icons/hi';
import {
	IoDownloadOutline,
	IoTrashOutline,
	IoEyeOutline,
	IoEyeOffOutline,
} from 'react-icons/io5';
import { Box, Icon, IconButton, Menu, Portal } from '@chakra-ui/react';
import type { AdminDocument } from '../../../../api/admin';

interface ActionMenuProps {
	doc: AdminDocument;
	onViewPdf: (buildingId: number) => void;
	onToggleVisibility: (docId: number) => void;
	onDelete: (docId: number) => void;
}

export default function ActionMenu({
	doc,
	onViewPdf,
	onToggleVisibility,
	onDelete,
}: ActionMenuProps) {
	return (
		<Box position="relative" display="inline-block">
			<Menu.Root>
				<Menu.Trigger asChild>
					<IconButton
						variant="ghost"
						size="sm"
						onClick={(e) => e.stopPropagation()}
					>
						<Icon as={HiDotsVertical} fontSize="lg" />
					</IconButton>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content
							borderRadius="l"
							shadow="xl"
							border="1px"
							borderColor="border.default"
							overflow="hidden"
							zIndex="50"
						>
							<Menu.Item
								value="download"
								px="4"
								py="3"
								gap="3"
								cursor="pointer"
								_hover={{
									bg: 'action.secondaryHover',
								}}
								onClick={(e) => {
									e.stopPropagation();
									onViewPdf(doc.building?.id || 0);
								}}
							>
								<Icon as={IoDownloadOutline} fontSize="lg" />
								Stiahnuť PDF
							</Menu.Item>
							<Menu.Item
								value="toggle-visibility"
								px="4"
								py="3"
								gap="3"
								cursor="pointer"
								_hover={{
									bg: 'action.secondaryHover',
								}}
								onClick={(e) => {
									e.stopPropagation();
									onToggleVisibility(doc.id);
								}}
							>
								{doc.isHidden ? (
									<>
										<Icon as={IoEyeOutline} fontSize="lg" />
										Zobraziť
									</>
								) : (
									<>
										<Icon as={IoEyeOffOutline} fontSize="lg" />
										Skryť
									</>
								)}
							</Menu.Item>
							<Menu.Item
								value="delete"
								px="4"
								py="3"
								gap="3"
								cursor="pointer"
								color="red.600"
								_hover={{ color: 'red.700', bg: 'red.50' }}
								onClick={(e) => {
									e.stopPropagation();
									onDelete(doc.id);
								}}
							>
								<Icon as={IoTrashOutline} fontSize="lg" />
								Odstrániť
							</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		</Box>
	);
}
