import React from 'react';
import SideBar from '../Components/Sidebar';
import './MainLayout.css'; 

function MainLayout({ children, handleLogout, userRole }) {
  return (
    <div className="main-layout">
      <header className="header">
        <h1>NeuroFormatter</h1>
      </header>
      {userRole && <SideBar handleLogout={handleLogout} userRole={userRole} />}
      <div className="content-area">
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
