import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../auth';
import { Flex, Spinner } from '@chakra-ui/react';

interface AdminRouteProps {
	children: React.ReactNode;
}

/**
 * Komponenta pre chránené admin routy
 * Povoľuje prístup len používateľom s admin rolou
 * Predpokladá, že je už obalená v ProtectedRoute (user je prihlásený)
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
	const { data: session, isPending } = useSession();

	// Počkaj kým sa načíta session
	if (isPending) {
		return (
			<Flex minH="100vh" align="center" justify="center">
				<Spinner size="xl" color="indigo.500" borderWidth="2px" />
			</Flex>
		);
	}

	// Ak nie je admin, presmeruj na hlavnú stránku
	if (session?.user?.role !== 'admin') {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
};

export default AdminRoute;
