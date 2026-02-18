import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { motion } from 'framer-motion';

function Sidebar({ notCompletedCount }) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));
  const role = user?.role || '';
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setShowSidebar(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {isMobile && (
        <Button
          variant="light"
          className="position-fixed top-0 start-0 m-2 z-3"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <i className="bi bi-list" />
        </Button>
      )}

      <aside className={`sidebar  text-white p-3 vh-100 ${showSidebar ? 'd-block' : 'd-none'}`}>
   {/* User Info */}
        <div className="text-center mb-4">
          <div
            className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
            style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}
          >
            {userInitial}
          </div>
          <div className="mt-2 fw-semibold">{userName}</div>
          <div style={{ fontSize: '0.8rem', color: '#bbb' }}>{role.toUpperCase()}</div>
        </div>

        {/* Navigation */}
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link text-light">
              <i className="bi bi-ui-checks me-2" /> Dashboard
            </Link>
          </li>

          {role === 'admin' && (
            <>
              <li className="nav-item">
                <Link to="/Assignticket" className="nav-link text-light">
                  <i className="bi bi-ui-checks me-2" /> Assign Tickets
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/completedtickets" className="nav-link text-light">
                  <i className="bi bi-list-check me-1" /> Completed Tickets
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/requeststatus" className="nav-link text-light">
                  <i className="bi bi-journal-text me-2" /> Request Status
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/worklogreport" className="nav-link text-light">
                  <i className="bi bi-box-arrow-right me-2" /> Worklog Report
                </Link>
              </li>
                <li className="ms-2">
                <Link to="/Renewal" style={{backgroundColor:"white" ,border:"4px black",color:"black"}} className="nav-link  fs-6 ">
                  <i className="bi  me-2" /> Renewal Dates
                </Link>
              </li>
              <li className="ms-2 mt-3">
  <Link
    to="/amcrenewal"
    style={{ backgroundColor: "white", border: "2px solid black", color: "black" }}
    className="nav-link fs-6"
  >
    <i className="bi bi-calendar-check me-2" /> AMC / Renewal AMC
  </Link>
</li>

              
            </>
          )}

          {role === 'employee' && (
            <>
            <li className="nav-item">
              <Link to="/ticket" className="nav-link text-light">
                <i className="bi bi-card-checklist me-2" /> Tickets  {notCompletedCount > 0 && (
              <span className="badge bg-danger ms-2">{notCompletedCount}</span>
            )}
              </Link>
            </li>
              <li className="nav-item">
  <Link to="/request" className="nav-link text-light">
    <i className="bi bi-card-checklist me-2" /> Request Status
  </Link>
</li>
           <li className="nav-item">
  <Link to="/completestatus" className="nav-link text-light">
    <i className="bi bi-card-checklist me-2" /> Completed Status
  </Link>
</li>
           <li className="nav-item">
  <Link to="/Report" className="nav-link text-light">
    <i className="bi bi-card-checklist me-2" /> Worklog
  </Link>
</li>

            </>
          )}
        </ul>
      </aside>
    </>
  );
}

export default Sidebar;
