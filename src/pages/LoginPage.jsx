import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Form,
  Button,
  ToggleButton,
  ButtonGroup,
  Spinner,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import loginImg from '../assets/login.png';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const API_LOGIN = 'http://localhost:4000/login';

const LoginPage = () => {
  const [role, setRole] = useState('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter both Email and Password');
      return;
    }

    setLoading(true);
    try {
      const backendRole = role === 'manager' ? 'admin' : 'employee';

      const { data } = await axios.post(API_LOGIN, {
        gmail: username,
        password,
        role: backendRole,
      });

      toast.success('Login successful!', { autoClose: 1500 });
      localStorage.setItem('user', JSON.stringify(data));
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Invalid credentials or role mismatch');
      } else {
        toast.error('Server error while logging in');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page bg-light">
      <ToastContainer />
      <div className="container-fluid min-vh-100 d-flex flex-column flex-md-row align-items-center justify-content-center p-4">

        {/* Left Illustration */}
        <motion.div
          className="col-md-6 text-center mb-4 mb-md-0"
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="fw-bold mb-4 display-3"
            style={{ color: '#1400FF' }}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 10,
              delay: 0.2,
            }}
          >
            Anywhere Works
          </motion.h1>
          <motion.img
            src={loginImg}
            alt="illustration"
            className="img-fluid"
            style={{ maxHeight: '420px' }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </motion.div>

        {/* Login Form Box */}
        <motion.div
          className="col-md-4 p-4 shadow rounded bg-white"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h4
            className="fw-bold text-center mb-4"
            style={{ color: '#1400FF' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Login
          </motion.h4>

          {/* Role Selector */}
          <ButtonGroup className="w-100 mb-3">
            {['manager', 'employee'].map((r) => (
              <ToggleButton
                key={r}
                id={`radio-${r}`}
                type="radio"
                variant={role === r ? 'primary' : 'outline-primary'}
                className="w-50 fw-semibold"
                name="role"
                value={r}
                checked={role === r}
                onChange={(e) => setRole(e.currentTarget.value)}
              >
                <i
                  className={`bi me-2 ${
                    r === 'manager' ? 'bi-briefcase-fill' : 'bi-person-fill'
                  }`}
                />
                {r === 'manager' ? "I'm Manager" : "I'm Employee"}
              </ToggleButton>
            ))}
          </ButtonGroup>

          {/* Email */}
          <Form.Group className="mb-3 position-relative">
            <Form.Control
              type="email"
              placeholder="Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <i className="bi bi-envelope position-absolute end-0 top-50 translate-middle-y me-3 text-muted" />
          </Form.Group>

          {/* Password */}
          <Form.Group className="mb-2 position-relative">
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <i className="bi bi-lock position-absolute end-0 top-50 translate-middle-y me-3 text-muted" />
          </Form.Group>

          {/* Forgot Password Link */}
          <motion.div
            className="text-end mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
          <Link
  to="/forgot-password"
  style={{ fontSize: '0.9rem', color: '#1400FF', textDecoration: 'none' }}
>
  Forgot Password?
</Link>
          </motion.div>

          {/* Sign In Button */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleLogin}
              className="w-100 fw-semibold"
              style={{
                backgroundColor: '#1400FF',
                border: 'none',
                padding: '0.5rem 1.2rem',
              }}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Sign In'}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
