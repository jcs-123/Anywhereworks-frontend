import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Container, Pagination, Spinner, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import 'bootstrap/dist/css/bootstrap.min.css';

const STATUS_COLOR_MAP = {
  assigned: 'primary',
  completed: 'success',
  working: 'info',
  pending: 'warning',
  rejected: 'danger',
  default: 'secondary',
   

};

function Requestdetails() {
  const [ticketData, setTicketData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const rowsPerPage = 8;

  useEffect(() => {
    document.title = 'Request Details';
    fetchRequestTickets();
  }, []);

  const fetchRequestTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:4000/ticketrequest');

      const rawData = response.data?.data || [];

      const filtered = rawData.filter(
        (ticket) => Array.isArray(ticket.timeRequests) && ticket.timeRequests.length > 0
      );

      setTicketData(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load request tickets.');
      setTicketData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = ticketData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(ticketData.length / rowsPerPage));

  const formatDate = (dateString) => {
    if (!dateString || dateString.startsWith('0000')) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatTime = (dateString) => {
    if (!dateString || dateString.startsWith('0000')) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN');
  };

  const getStatusBadge = (status = 'Not started') => {
    const normalized = status.toLowerCase();
    const color = STATUS_COLOR_MAP[normalized] || STATUS_COLOR_MAP.default;
    return <Badge bg={color} className="text-capitalize">{status}</Badge>;
  };

  return (
    <div>
      <Header />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="mb-4 fw-bold text-center">Request Status Details</h3>

            <div className="table-responsive bg-white p-3 rounded shadow-sm">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading tickets...</p>
                </div>
              ) : error ? (
                <p className="text-danger text-center">{error}</p>
              ) : currentRows.length === 0 ? (
                <p className="text-center text-muted py-5">No time extension requests found.</p>
              ) : (
                <Table bordered hover responsive className="text-center align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Status</th>
                      <th>Ticket No</th>
                      <th>Project</th>
                      <th>Subject</th>
                      <th>Requested Hours</th>
                      <th>Request Status</th>
                                            <th>Request Reason</th>

                    </tr>
                  </thead>
              <tbody>
  {currentRows.map((ticket, index) => {
    const latestRequest = ticket.timeRequests?.[ticket.timeRequests.length - 1];
    return (
      <motion.tr
        key={ticket._id || `ticket-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <td>{indexOfFirstRow + index + 1}</td>
        <td>{getStatusBadge(ticket.status)}</td>
        <td>{ticket.ticketNo || 'N/A'}</td>
        <td>{ticket.projectName || 'N/A'}</td>
        <td style={{ whiteSpace: 'pre-line' }}>{ticket.subject || 'N/A'}</td>
        {/* Removed Created Date */}
        {/* Removed Request Time */}
        <td>{latestRequest?.hours ?? 'N/A'}</td>
        <td>{getStatusBadge(latestRequest?.status || 'Pending')}</td>
        <td>{latestRequest?.reason || 'N/A'}</td> {/* ✅ New Request Reason */}
      </motion.tr>
    );
  })}
</tbody>

                </Table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination>
                  <Pagination.Prev
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Pagination.Item
                      key={i}
                      active={i + 1 === currentPage}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  />
                </Pagination>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default Requestdetails;
