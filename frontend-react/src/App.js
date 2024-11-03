// App.js
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import ConvertPage from './Pages/ConvertPage';
import HistoryPage from './Pages/HistoryPage';
import ProfilePage from './Pages/MyProfilePage';
import ManageAccountPage from './Pages/ManageAccountPage';
import ManageInformationPage from './Pages/ManageInformationPage';
import LoginPage from './Pages/LoginPage';
import DeliveryOrderDatabasePage from './Pages/DeliveryOrderDatabasePage';
import GoodsReceivedDatabasePage from './Pages/GoodsReceivedDatabasePage';
import ManageTemplate from './Pages/ManageTemplate';
import MainLayout from './Layout/MainLayout';

function App() {
  const [userRole, setUserRole] = useState(null); 

  const handleLogin = (role) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null); 
    localStorage.removeItem('access_token'); 
  };


  return (
    <>
      <Routes>
        <Route path="/loginPage" element={<LoginPage setUserRole={handleLogin} />} />
        <Route path="/homePage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><HomePage/></MainLayout> : <Navigate to="/loginPage"/>} />
        <Route path="/convertPage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><ConvertPage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/DOPage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><DeliveryOrderDatabasePage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/GRPage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><GoodsReceivedDatabasePage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/historyPage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><HistoryPage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/myProfilePage" element={userRole ? <MainLayout handleLogout={handleLogout} userRole={userRole}><ProfilePage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/manageAccountPage" element={userRole === "ADMIN" ? <MainLayout handleLogout={handleLogout} userRole={userRole}><ManageAccountPage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/manageInformationPage" element={userRole === "ADMIN" ? <MainLayout handleLogout={handleLogout} userRole={userRole}><ManageInformationPage /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/manageTemplate" element={userRole === "ADMIN" ? <MainLayout handleLogout={handleLogout} userRole={userRole}><ManageTemplate /></MainLayout> : <Navigate to="/loginPage" />} />
        <Route path="/" element={<Navigate to="/loginPage" />} />
      </Routes>
    </>
  );
}

export default App;
