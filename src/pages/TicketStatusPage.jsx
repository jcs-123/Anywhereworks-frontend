import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Table,
  Form,
  Pagination,
  Spinner,
  Alert,
  Badge,
  Button
} from 'react-bootstrap';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const STATUS_COLORS = {
  completed: 'primary',
  verified: 'success',
};

const PAGE_WINDOW = 5;       // show only 5 page numbers
const ROWS_PER_PAGE = 20;    // 20 rows per page

const TicketStatusPage = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // ✅ Get logged-in user info
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  }, []);

  const userEmail = (user?.gmail || '').toLowerCase();

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            assignedTo === userEmail
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
          return aNo - bNo;
        });

      setTickets(filtered);
      setFilteredTickets(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Search + Date Filter
  const handleFilters = (value = search, sDate = startDate, eDate = endDate) => {
    let filtered = tickets;

    // text search
    if (value) {
      filtered = filtered.filter(ticket => {
        const { subject = '', projectName = '', ticketNo = '', latestRequest } = ticket;
        return (
          subject.toLowerCase().includes(value) ||
          projectName.toLowerCase().includes(value) ||
          ticketNo.toString().includes(value) ||
          latestRequest?.reason?.toLowerCase().includes(value)
        );
      });
    }

    // date filter
    if (sDate || eDate) {
      filtered = filtered.filter(ticket => {
        if (!ticket.completedTime) return false;
        const completed = new Date(ticket.completedTime);
        if (sDate && completed < new Date(sDate.setHours(0,0,0,0))) return false;
        if (eDate && completed > new Date(eDate.setHours(23,59,59,999))) return false;
        return true;
      });
    }

    setFilteredTickets(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    handleFilters(value, startDate, endDate);
  };

  const handleDateChange = (type, date) => {
    if (type === 'start') setStartDate(date);
    if (type === 'end') setEndDate(date);
    handleFilters(search, type === 'start' ? date : startDate, type === 'end' ? date : endDate);
  };

  const getStatusBadge = (status = '') => {
    const color = STATUS_COLORS[status.toLowerCase()] || 'secondary';
    return <Badge bg={color} className="text-capitalize">{status}</Badge>;
  };

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / ROWS_PER_PAGE);
  const indexOfLastRow = currentPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

  const windowStart = Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);
  const pageNumbers = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  // Totals
  const totalExpected = filteredTickets.reduce((sum, t) => sum + (Number(t.expectedHours) || 0), 0);
  const totalRequested = filteredTickets.reduce((sum, t) => sum + (Number(t.latestRequest?.hours) || 0), 0);

  // ✅ Export Excel
  const exportToExcel = () => {
    const fileName = `tickets_completed_${new Date().toISOString().slice(0,10)}.xlsx`;
    const wsData = [
      [`Completed / Verified Tickets`],
      [`Generated on: ${new Date().toLocaleString()}`],
      [`Filters: ${startDate ? startDate.toLocaleDateString() : '...'} - ${endDate ? endDate.toLocaleDateString() : '...'}`],
      [],
      ["Ticket No", "Status", "Project", "Subject", "Expected Hours", "Requested Hours", "Reason", "Completed Time"],
      ...filteredTickets.map(t => [
        t.ticketNo || 'N/A',
        t.status || 'N/A',
        t.projectName || 'N/A',
        t.subject || 'N/A',
        Number(t.expectedHours) || 0,
        t.latestRequest?.hours ?? 0,
        t.latestRequest?.reason ?? 'N/A',
        t.completedTime ? new Date(t.completedTime).toLocaleString() : 'N/A'
      ]),
      ["Total", "", "", "", totalExpected, totalRequested, "", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="container-fluid">
              <h3 className="text-center fw-bold mb-4">Completed / Verified Tickets</h3>

              {/* Filters */}
              <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
                <Form.Control
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={handleSearch}
                  style={{ maxWidth: '250px' }}
                />
                <div className="d-flex gap-2 align-items-center">
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => handleDateChange('start', date)}
                    placeholderText="Start Date"
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                  />
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => handleDateChange('end', date)}
                    placeholderText="End Date"
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                  />
                </div>
                <div className="d-flex gap-2">
                  <Button variant="success" onClick={exportToExcel}>Export Excel</Button>
                  <Button variant="primary" onClick={fetchTickets} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>

              {/* Table */}
              {error ? (
                <Alert variant="danger" className="text-center">
                  {error}
                  <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchTickets}>
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
                        setCurrentPage(1);
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
                          <th>Completed Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.map((ticket, index) => (
                          <motion.tr
                            key={ticket._id || `${ticket.ticketNo}-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                          >
                            <td>{ticket.ticketNo ?? 'N/A'}</td>
                            <td>{getStatusBadge(ticket.status)}</td>
                            <td>{ticket.projectName ?? 'N/A'}</td>
                            <td style={{ whiteSpace: 'pre-line' }}>{ticket.subject ?? 'N/A'}</td>
                            <td>{Number(ticket.expectedHours) || 0}</td>
                            <td>{ticket.latestRequest?.hours ?? 0}</td>
                            <td>{ticket.latestRequest?.reason ?? 'N/A'}</td>
                            <td>{ticket.completedTime ? new Date(ticket.completedTime).toLocaleString() : 'N/A'}</td>
                          </motion.tr>
                        ))}
                        <tr className="fw-bold bg-light">
                          <td colSpan="4" className="text-end">Total</td>
                          <td>{totalExpected}</td>
                          <td>{totalRequested}</td>
                          <td colSpan="2">-</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center mt-4">
                      <Pagination className="mb-0">
                        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                        <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />

                        {windowStart > 1 && (
                          <>
                            <Pagination.Item onClick={() => setCurrentPage(1)}>1</Pagination.Item>
                            <Pagination.Ellipsis onClick={() => setCurrentPage(windowStart - 1)} />
                          </>
                        )}

                        {pageNumbers.map(p => (
                          <Pagination.Item key={p} active={currentPage === p} onClick={() => setCurrentPage(p)}>
                            {p}
                          </Pagination.Item>
                        ))}

                        {windowEnd < totalPages && (
                          <>
                            <Pagination.Ellipsis onClick={() => setCurrentPage(windowEnd + 1)} />
                            <Pagination.Item onClick={() => setCurrentPage(totalPages)}>{totalPages}</Pagination.Item>
                          </>
                        )}

                        <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
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
