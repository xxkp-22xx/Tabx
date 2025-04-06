import React from 'react';
import { Outlet } from 'react-router-dom';
import "../styles/styles.css";

const Layout = () => {
  return (
    <div className="app-container">
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;