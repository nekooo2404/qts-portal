import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../tokens.css';
import App from './App';
import './styles.css';
import './portal.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Không tìm thấy phần tử gốc để khởi tạo QTS Portal.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
