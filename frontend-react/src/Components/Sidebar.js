import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "./Sidebar.css";
import { SidebarData } from "./SidebarData";

function Sidebar({ userRole }) {
  const navigate = useNavigate(); 

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate("/loginPage");
  };

  return (
    <div className="Sidebar">
      <ul className="SidebarList">
        {SidebarData.map((val, key) => {
          if (userRole !== "ADMIN" && (val.title === "Manage Account" || val.title === "Manage Information" || val.title === "Manage Template")) {
            return null; 
          }
          if (val.title === "Logout") {
            return (
              <li
                key={key}
                className="row logout"
                onClick={handleLogout}
              >
                <div id="icon">{val.icon}</div>
                <div id="title">{val.title}</div>
              </li>
            );
          }
          return (
            <li
              key={key}
              className={val.title === "Logout" ? "row logout" : "row"}
              id={window.location.pathname === val.link ? "active" : ""}
            >
              <Link to={val.link} className="SidebarItem">
                <div id="icon">{val.icon}</div>
                <div id="title">{val.title}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Sidebar;
