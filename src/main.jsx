import { createRoot } from 'react-dom/client';
// Fonts are bundled instead of loaded from Google: no third-party request on every visit.
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/inter/700.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <App />,
);
