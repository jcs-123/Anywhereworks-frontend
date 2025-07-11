import React from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap-icons/font/bootstrap-icons.css";

function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user'));
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky-top bg-white shadow-sm px-3 py-2" style={{ zIndex: 1020 }}>
      <div className="container-fluid d-flex flex-wrap justify-content-between align-items-center">
        {/* Title (Responsive size) */}
        <h4 className="fw-bold mb-0 text-center text-md-start" style={{ fontSize: '1.5rem' }}>
          Anywhere Works
        </h4>

        {/* User Info & Logout */}
        <div className="d-flex align-items-center mt-2 mt-md-0">
          {/* Avatar and Name */}
          <div className="d-flex align-items-center me-3">
            <div
              className="bg-info text-white d-flex justify-content-center align-items-center me-2"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                fontSize: '1rem',
              }}
            >
              {userInitial}
            </div>
            <span className="fw-semibold d-none d-sm-inline">{userName}</span>
          </div>

          {/* Logout Button (Always visible, styled responsively) */}
        <button className="btn btn-dark btn-sm d-flex align-items-center" onClick={handleLogout}>
  <i className="bi bi-box-arrow-right me-1"></i>
  <span className="d-none d-md-inline">Logout</span>
</button>

        </div>
      </div>
    </header>
  );
}

export default Header;
