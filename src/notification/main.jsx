import React from 'react';
import { createRoot } from 'react-dom/client';
import { Notification } from './Notification';
import '../../legacy/notification.css';

const params = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(
  <React.StrictMode><Notification params={params} bridge={window.healthReminder} /></React.StrictMode>
);


