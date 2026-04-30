import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../auth';
import { Flex, Spinner } from '@chakra-ui/react';

export const AdminRoute: React.FC = () => {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<Flex minH="100vh" align="center" justify="center">
				<Spinner size="xl" color="indigo.500" borderWidth="2px" />
			</Flex>
		);
	}

	if (session?.user?.role !== 'admin') {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
};

export default AdminRoute;
