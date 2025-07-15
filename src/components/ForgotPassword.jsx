import React, { useState } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import fg from '../assets/fg.jpg'; // Background image

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const trimmedEmail = email.toLowerCase().trim();

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!trimmedEmail) return toast.error('Please enter your email');
    setLoading(true);
    try {
      const res = await axios.post('https://anywhereworks-backend.onrender.com/forgot-password', {
        gmail: trimmedEmail,
      });
      toast.success(res.data.message || 'OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter OTP');
    setLoading(true);
    try {
      const res = await axios.post('https://anywhereworks-backend.onrender.com/verify-otp', {
        gmail: trimmedEmail,
        otp,
      });
      toast.success(res.data.message || 'OTP verified!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

 // Step 3: Reset Password
const handleResetPassword = async (e) => {
  e.preventDefault();

  if (!email) return toast.error('Email is missing. Please restart.');
  if (!newPassword || newPassword.trim().length < 6) {
    return toast.error('Password must be at least 6 characters long.');
  }

  const trimmedEmail = email.toLowerCase().trim();
  const trimmedPassword = newPassword.trim();

  setLoading(true);

  try {
    const res = await axios.post('https://anywhereworks-backend.onrender.com/reset-password', {
      gmail: trimmedEmail,
      newPassword: trimmedPassword,
    });

    if (res.status === 200) {
      toast.success(res.data.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 500);
    } else {
      toast.error(res.data.message || 'Unexpected response from server.');
    }

  } catch (err) {
    console.error('Reset password error:', err);
    toast.error(err.response?.data?.message || 'Password reset failed. Please try again.');
  } finally {
    setLoading(false);
  }
};


  return (
    <motion.div
      className="container-fluid d-flex flex-column justify-content-center align-items-center vh-100"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.6), rgba(5,5,10,0.6)), url(${fg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <ToastContainer position="top-center" autoClose={3000} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="p-4 p-md-5 rounded-4 w-100"
          style={{
            maxWidth: 450,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 120 }}
        >
          <motion.h3 className="text-center mb-4 fw-bold text-white">
            Forgot Password
          </motion.h3>

          {/* Step 1 */}
          {step === 1 && (
            <Form onSubmit={handleSendOTP}>
              <Form.Group className="mb-4">
                <Form.Label className="text-light">Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="py-2 px-3 rounded-3 bg-white bg-opacity-75 border-0"
                />
              </Form.Group>
              <Button
                type="submit"
                className="w-100 fw-bold py-2 rounded-3 border-0"
                style={{
                  background: 'linear-gradient(90deg, #6a11cb, #2575fc)',
                  color: 'white',
                }}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </Form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Form onSubmit={handleVerifyOTP}>
              <Form.Group className="mb-4">
                <Form.Label className="text-light">
                  OTP sent to: <b className="text-warning">{trimmedEmail}</b>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  className="py-2 px-3 rounded-3 bg-white bg-opacity-75 border-0"
                />
              </Form.Group>
              <Button
                type="submit"
                className="w-100 fw-bold py-2 rounded-3 border-0"
                style={{
                  background: 'linear-gradient(90deg, #43cea2, #185a9d)',
                  color: 'white',
                }}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </Form>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Form onSubmit={handleResetPassword}>
              <Form.Group className="mb-4">
                <Form.Label className="text-light">New Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="py-2 px-3 rounded-3 bg-white bg-opacity-75 border-0"
                />
              </Form.Group>
              <Button
                type="submit"
                className="w-100 fw-bold py-2 rounded-3 border-0"
                style={{
                  background: 'linear-gradient(90deg, #ff6a00, #ee0979)',
                  color: 'white',
                }}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                {loading ? 'Updating...' : 'Reset Password'}
              </Button>
            </Form>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default ForgotPassword;
