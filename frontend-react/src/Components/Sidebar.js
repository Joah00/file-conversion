import React from 'react';
import { Link } from 'react-router-dom';
import "./Sidebar.css";
import { SidebarData } from "./SidebarData";

function Sidebar() {
  return (
    <div className="Sidebar">
      <ul className="SidebarList">
        {SidebarData.map((val, key) => {
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
