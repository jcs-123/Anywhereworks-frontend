import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  Form,
  Pagination,
  Spinner,
  Alert,
  Badge
} from 'react-bootstrap';
import { motion } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const STATUS_COLORS = {
  completed: 'primary',
  verified: 'success',
};

const TicketStatusPage = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const rowsPerPage = 6;


// ✅ Get logged-in user info
 const user = JSON.parse(localStorage.getItem('user'));
  const userEmail = user?.gmail?.toLowerCase(); // use 'gmail' as key
  const userName = user?.name || 'User';
  const userRole = user?.role || 'employee';
  useEffect(() => {
    fetchTickets();
  }, []);

 const fetchTickets = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await axios.get('https://anywhereworks-backend.onrender.com/ticketrequest');

    const data = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.tickets)
      ? res.data.tickets
      : Array.isArray(res.data)
      ? res.data
      : [];

    const filtered = data
      .filter(ticket => {
        const status = ticket.status?.toLowerCase();
        const assignedTo = ticket.assignedTo?.toLowerCase() || '';
        return (
          (status === 'completed' || status === 'verified') &&
          assignedTo === userEmail?.toLowerCase()
        );
      })
      .map(ticket => ({
        ...ticket,
        latestRequest: Array.isArray(ticket.timeRequests)
          ? ticket.timeRequests[ticket.timeRequests.length - 1] || null
          : null,
      }))
      .sort((a, b) => {
        const aNo = parseInt(a.ticketNo || 0, 10);
        const bNo = parseInt(b.ticketNo || 0, 10);
        return aNo - bNo; // ascending
      });

    setTickets(filtered);
    setFilteredTickets(filtered);
  } catch (err) {
    console.error('Fetch error:', err);
    setError('Failed to load tickets. Please try again.');
  } finally {
    setLoading(false);
  }
};


  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);

    const filtered = tickets.filter(ticket => {
      const { subject = '', projectName = '', ticketNo = '', latestRequest } = ticket;
      return (
        subject.toLowerCase().includes(value) ||
        projectName.toLowerCase().includes(value) ||
        ticketNo.toString().includes(value) ||
        latestRequest?.reason?.toLowerCase().includes(value)
      );
    });

    setFilteredTickets(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (status = '') => {
    const color = STATUS_COLORS[status.toLowerCase()] || 'secondary';
    return <Badge bg={color} className="text-capitalize">{status}</Badge>;
  };

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="container-fluid">
              <h3 className="text-center fw-bold mb-4">
                Completed / Verified Tickets
              </h3>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <Form.Control
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={handleSearch}
                  style={{ maxWidth: '300px' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={fetchTickets}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {error ? (
                <Alert variant="danger" className="text-center">
                  {error}
                  <button
                    className="btn btn-sm btn-outline-danger ms-3"
                    onClick={fetchTickets}
                  >
                    Retry
                  </button>
                </Alert>
              ) : loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-3">Loading tickets...</p>
                </div>
              ) : currentRows.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No completed or verified tickets found.</p>
                  {search && (
                    <button
                      className="btn btn-outline-secondary btn-sm mt-2"
                      onClick={() => {
                        setSearch('');
                        setFilteredTickets(tickets);
                      }}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="table-responsive bg-white p-3 rounded shadow-sm">
                    <Table striped bordered hover responsive className="align-middle">
                      <thead className="table-dark">
                        <tr>
                          <th>Ticket No</th>
                          <th>Status</th>
                          <th>Project</th>
                          <th>Subject</th>
                          <th>Expected Hours</th>
                          <th>Requested Hours</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.map((ticket, index) => (
                          <motion.tr
                            key={ticket._id || index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            <td>{ticket.ticketNo ?? 'N/A'}</td>
                            <td>{getStatusBadge(ticket.status)}</td>
                            <td>{ticket.projectName ?? 'N/A'}</td>
                            <td style={{ whiteSpace: 'pre-line' }}>
                              {ticket.subject ?? 'N/A'}
                            </td>
                            <td>{ticket.expectedHours ?? 'N/A'}</td>
                            <td>{ticket.latestRequest?.hours ?? 'N/A'}</td>
                            <td>{ticket.latestRequest?.reason ?? 'N/A'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center mt-4">
                      <Pagination>
                        <Pagination.First
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        />
                        <Pagination.Prev
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        />
                        {Array.from({ length: totalPages }, (_, i) => (
                          <Pagination.Item
                            key={i}
                            active={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        />
                        <Pagination.Last
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        />
                      </Pagination>
                      <span className="ms-3 text-muted">
                        Page {currentPage} of {totalPages} ({filteredTickets.length} tickets)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default TicketStatusPage;
