import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	Outlet,
} from 'react-router-dom';

import BuildingDetail from './pages/building/BuildingDetail';
import BuildingsSearch from './pages/BuildingsSearch';
import Admin from './pages/admin/Administration';
import { UserManagement } from './pages/admin/UserManagement';
import { LoginPage } from './pages/LoginPage';
import { Box } from '@chakra-ui/react';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { Navbar } from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { Toaster } from './components/ui/toaster';

// Layout s navbar pre chránené stránky.
// Render-uje `<Outlet />` pre vnorené routy.
function ProtectedLayout() {
	return (
		<Box minH="100vh" bg="bg.canvas">
			<Navbar />
			<Outlet />
		</Box>
	);
}

function App() {
	return (
		<BrowserRouter>
			<Toaster />
			<Routes>
				{/* Verejné routy */}
				<Route path="/login" element={<LoginPage />} />
				<Route path="/accept-invite" element={<AcceptInvitePage />} />

				{/* Chránené routy — vyžadujú prihlásenie */}
				<Route element={<ProtectedRoute />}>
					<Route element={<ProtectedLayout />}>
						<Route path="/" element={<BuildingsSearch />} />
						<Route path="/buildings/:id" element={<BuildingDetail />} />

						{/* Admin routy — vyžadujú admin rolu */}
						<Route element={<AdminRoute />}>
							<Route path="/admin" element={<Admin />} />
							<Route path="/admin/users" element={<UserManagement />} />
						</Route>
					</Route>
				</Route>

				{/* Fallback — presmerovanie na hlavnú stránku */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
