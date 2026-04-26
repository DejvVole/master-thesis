import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

// Layout s navbar pre chránené stránky
function ProtectedLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedRoute>
			<Box minH="100vh" bg="bg.canvas">
				<Navbar />
				{children}
			</Box>
		</ProtectedRoute>
	);
}

function App() {
	return (
		<BrowserRouter>
			<Toaster />
			<Routes>
				{/* Verejná routa - login */}
				<Route path="/login" element={<LoginPage />} />

				{/* Verejná routa - prijatie pozvánky */}
				<Route path="/accept-invite" element={<AcceptInvitePage />} />

				{/* Chránené routy - vyžadujú prihlásenie */}
				<Route
					path="/"
					element={
						<ProtectedLayout>
							<BuildingsSearch />
						</ProtectedLayout>
					}
				/>
				<Route
					path="/buildings/:id"
					element={
						<ProtectedLayout>
							<BuildingDetail />
						</ProtectedLayout>
					}
				/>

				{/* Admin routy - vyžadujú admin rolu */}
				<Route
					path="/admin"
					element={
						<ProtectedLayout>
							<AdminRoute>
								<Admin />
							</AdminRoute>
						</ProtectedLayout>
					}
				/>
				<Route
					path="/admin/users"
					element={
						<ProtectedLayout>
							<AdminRoute>
								<UserManagement />
							</AdminRoute>
						</ProtectedLayout>
					}
				/>

				{/* Fallback - presmerovanie na hlavnú stránku */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
