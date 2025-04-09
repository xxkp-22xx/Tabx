import React from 'react';
import { Link } from 'react-router-dom';
import "../styles/styles.css";

const NavBar = () => {
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link to="/groups" className="nav-logo">
          TabX
        </Link>
        <div className="nav-links">
          <Link to="/groups" className="nav-link">
            Groups
          </Link>
          <Link to="/group-debts" className="nav-link">
            Debts
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;