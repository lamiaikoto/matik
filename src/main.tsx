import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Initialize i18next before mounting the app (synchronous since resources are bundled)
import './i18n';
import { LocaleProvider } from './context/LocaleContext';

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>
);
