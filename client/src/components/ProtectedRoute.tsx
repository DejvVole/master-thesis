import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react';
import { useSession } from '../auth';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { data: session, isPending } = useSession();
	const location = useLocation();

	if (isPending) {
		return (
			<Flex minH="100vh" align="center" justify="center">
				<Spinner size="xl" color="indigo.500" borderWidth="2px" />
			</Flex>
		);
	}

	// Ak nie je používateľ prihlásený, presmeruj na login
	if (!session?.user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};

export default ProtectedRoute;
