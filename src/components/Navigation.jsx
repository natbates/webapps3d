import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';

import "../styles/Navbar.css";

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav id="nav-bar">

      <div className="nav-left">
        <img
          src={process.env.PUBLIC_URL + '/icon.svg'}
          alt="NES Logo"
          className="nav-logo"
          onClick={() => navigate('/')}
        />

        <div className="nav-title">
          <span>The</span> <em>1985</em> NES
        </div>
      </div>

      <div className="nav-menu">

        <Link to="/about" className="nav-link">
          About
        </Link>

        <Link to="/statement" className="nav-link">
          Statement of Originality
        </Link>

        <Link to="/references" className="nav-link">
          References
        </Link>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-github"
        >
          <FaGithub size={20} />
        </a>

      </div>

    </nav>
  );
}

export default Navigation;