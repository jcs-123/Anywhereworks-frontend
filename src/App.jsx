import { Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';

import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ForgotPassword from './components/ForgotPassword';
import Assigntickent from './pages/Assigntickent';
import Tickets from './pages/Tickets';
import RequestStatus from './pages/RequestStatus';
import CompletedTickets from './pages/CompletedTickets';
import Requestdetails from './pages/Requestdetails';
import TicketStatusPage from './pages/TicketStatusPage';
import ReportModule from './pages/ReportModule';
import Report from './pages/Report';
import Renewaldates from './pages/Renewaldates';
import Amcrenewal from './pages/Amcrenewal';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!user); // true if user exists
  }, []);

  return (
   
    <Routes>
      {/* Root Redirect */}
         <Route
        path="/"
        element={<Navigate to="/login" />}
      />

      {/* Login Route */}
      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={() => {
              setIsLoggedIn(true);
              localStorage.setItem('user', 'true'); // Optional: store user session
            }}
          />
        }
      />

      {/* Dashboard (Protected) */}
      <Route
        path="/dashboard"
        element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />}
      />

      {/* Forgot Password */}
      <Route path="/forgot-password" element={<ForgotPassword />} />

 {/* Dashboard (Protected) */}
      <Route
        path="/Assignticket"
        element={isLoggedIn ? <Assigntickent/> : <Navigate to="/login" />}
      />


    <Route
        path="/ticket"
        element={isLoggedIn ? <Tickets/>: <Navigate to="/login" />}
      />

  <Route
        path="/requeststatus"
        element={isLoggedIn ? <RequestStatus/>: <Navigate to="/login" />}
      />

  <Route
        path="/completedtickets"
        element={isLoggedIn ? <CompletedTickets/>: <Navigate to="/login" />}
      />
        <Route
        path="/request"
        element={isLoggedIn ? <Requestdetails/>: <Navigate to="/login" />}
      />
  <Route
        path="/completestatus"
        element={isLoggedIn ? <TicketStatusPage/>: <Navigate to="/login" />}
      />
  <Route
        path="/worklogreport"
        element={isLoggedIn ? <ReportModule/>: <Navigate to="/login" />}
      />
         <Route
        path="/Report"
        element={isLoggedIn ? <Report/>: <Navigate to="/login" />}
      />
         <Route
        path="/Renewal"
        element={isLoggedIn ? <Renewaldates/>: <Navigate to="/login" />}
      />
         <Route
        path="/amcrenewal"
        element={isLoggedIn ? <Amcrenewal/>: <Navigate to="/login" />}
      />
      {/* Fallback Route (Optional) */}
      <Route
        path="*"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
      />
    </Routes>
  );
}

export default App;
