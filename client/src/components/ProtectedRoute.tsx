import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react';
import { useSession } from '../auth';

export const ProtectedRoute: React.FC = () => {
	const { data: session, isPending } = useSession();
	const location = useLocation();

	if (isPending) {
		return (
			<Flex minH="100vh" align="center" justify="center">
				<Spinner size="xl" color="indigo.500" borderWidth="2px" />
			</Flex>
		);
	}

	if (!session?.user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
};

export default ProtectedRoute;
