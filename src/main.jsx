import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from './ui';
import theme from './theme';
import App from './App';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './lib/i18n';
import './index.css';
import './ui/ui.css';

const mount = document.getElementById( 'dinekit-root' );
if ( mount ) {
	createRoot( mount ).render(
		<React.StrictMode>
			<I18nProvider>
				<ThemeProvider theme={ theme }>
					<CssBaseline />
					<ToastProvider>
						<App />
					</ToastProvider>
				</ThemeProvider>
			</I18nProvider>
		</React.StrictMode>
	);
}
