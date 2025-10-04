import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Imports the main application logic from App.jsx
import './index.css';     // Imports the global styles, including Tailwind CSS

// Finds the root element in index.html and renders the React application inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode helps highlight potential problems in an application
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
