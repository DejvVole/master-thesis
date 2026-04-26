import { Table } from '@chakra-ui/react';
import { tableColumns } from '../../Admin.helper';

export default function TableHeader() {
	return (
		<Table.Header bg="bg.surface2">
			<Table.Row>
				{tableColumns.map((column) => (
					<Table.ColumnHeader
						key={column.id}
						px="6"
						py="4"
						textAlign="left"
						fontSize="xs"
						fontWeight="bold"
						textTransform="uppercase"
						letterSpacing="wider"
					>
						{column.label}
					</Table.ColumnHeader>
				))}
			</Table.Row>
		</Table.Header>
	);
}
