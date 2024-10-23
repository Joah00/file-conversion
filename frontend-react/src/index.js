import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import HomePage from './Pages/HomePage.js';
import ConvertPage from './Pages/ConvertPage';
import HistoryPage from './Pages/HistoryPage';
import ProfilePage from './Pages/MyProfilePage';
import ManageAccountPage from './Pages/ManageAccountPage.js';
import ManageInformationPage from './Pages/ManageInformationPage.js';
import LoginPage from './Pages/LoginPage.js';
import DeliveryOrderDatabasePage from './Pages/DeliveryOrderDatabasePage.js';
import GoodsReceivedDatabasePage from './Pages/GoodsReceivedDatabasePage.js';

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/homePage",
    element: <HomePage />,
  },
  {
    path: "/convertPage",
    element: <ConvertPage />,
  },
  {
    path: "/DOPage",
    element: <DeliveryOrderDatabasePage />,
  },
  {
    path: "/GRPage",
    element: <GoodsReceivedDatabasePage />,
  },
  {
    path: "/historyPage",
    element: <HistoryPage />,
  },
  {
    path: "/myProfilePage",
    element: <ProfilePage />,
  },
  {
    path: "/manageAccountPage",
    element: <ManageAccountPage />,
  },
  {
    path: "/manageInformationPage",
    element: <ManageInformationPage />,
  },
  {
    path: "/loginPage",
    element: <LoginPage />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);



reportWebVitals();
