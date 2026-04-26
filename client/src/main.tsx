import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { Provider } from './components/ui/provider.tsx';
import App from './App.tsx';

// Globálna konfigurácia axios - posielať cookies s každým requestom
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Provider>
			<App />
		</Provider>
	</StrictMode>
);
