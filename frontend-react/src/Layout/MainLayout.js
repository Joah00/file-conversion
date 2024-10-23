import React from 'react';
import SideBar from '../Components/Sidebar';
import './MainLayout.css'; // Assuming you add this new CSS file for layout

function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <header className="header">
        <h1>NeuroFormatter</h1>
      </header>
      
      <SideBar />
      <div className="content-area">
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
