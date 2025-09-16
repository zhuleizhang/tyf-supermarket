import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

import { bootstrap } from '@/bootstrap';

bootstrap();

createRoot(document.getElementById('root')!).render(<App />);
