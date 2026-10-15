import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary><App /></ErrorBoundary>
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#1B1E54', color: '#fff', fontSize: '14px', fontWeight: 600 }, success: { iconTheme: { primary: '#27B9A9', secondary: '#fff' } }, error: { style: { background: '#7F1D1D', color: '#fff' } } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
