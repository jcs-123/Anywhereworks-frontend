import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Table,
  Form,
  Pagination,
  Spinner,
  Alert,
  Badge,
  Button,
  OverlayTrigger,
  Tooltip
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

const PAGE_WINDOW = 5;
const ROWS_PER_PAGE = 20;

const TicketStatusPage = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEfinColumns, setShowEfinColumns] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Get logged-in user info
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
      
      // Check if there are any Efin tickets to determine column display
      const hasEfinTickets = filtered.some(t => t.projectName?.toLowerCase() === 'efin');
      setShowEfinColumns(hasEfinTickets);
      
      setCurrentPage(1);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Search + Date Filter
  const handleFilters = (value = search, sDate = startDate, eDate = endDate) => {
    let filtered = tickets;

    // text search
    if (value) {
      filtered = filtered.filter(ticket => {
        const { 
          subject = '', 
          projectName = '', 
          ticketNo = '', 
          latestRequest,
          descriptionEfin1 = '',
          descriptionEfin2 = ''
        } = ticket;
        
        const searchTerm = value.toLowerCase();
        return (
          subject.toLowerCase().includes(searchTerm) ||
          projectName.toLowerCase().includes(searchTerm) ||
          ticketNo.toString().includes(searchTerm) ||
          latestRequest?.reason?.toLowerCase().includes(searchTerm) ||
          descriptionEfin1.toLowerCase().includes(searchTerm) ||
          descriptionEfin2.toLowerCase().includes(searchTerm)
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

  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

  // Efin specific calculations
  const efinTickets = filteredTickets.filter(t => t.projectName?.toLowerCase() === 'efin');
  const efinTicketsWithDescriptions = efinTickets.filter(t => t.descriptionEfin1 || t.descriptionEfin2).length;
  const otherTicketsCount = filteredTickets.filter(t => t.projectName?.toLowerCase() !== 'efin').length;

  // Export Excel - Dynamic based on Efin tickets
  const exportToExcel = () => {
    const fileName = `tickets_completed_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    // Create headers dynamically based on whether there are Efin tickets
    const baseHeaders = ["Ticket No", "Status", "Project", "Subject", "Expected Hours", "Requested Hours", "Reason", "Completed Time"];
    const efinHeaders = ["Efin Desc 1", "Efin Desc 2"];
    const headers = showEfinColumns ? [...baseHeaders.slice(0, 4), ...efinHeaders, ...baseHeaders.slice(4)] : baseHeaders;
    
    const wsData = [
      [`Completed / Verified Tickets Report`],
      [`Generated on: ${new Date().toLocaleString()}`],
      [`Filters: ${startDate ? startDate.toLocaleDateString() : '...'} - ${endDate ? endDate.toLocaleDateString() : '...'}`],
      [`Total Tickets: ${filteredTickets.length} | Efin Tickets: ${efinTickets.length} | Other Tickets: ${otherTicketsCount}`],
      [],
      headers,
      ...filteredTickets.map(t => {
        const isEfin = t.projectName?.toLowerCase() === 'efin';
        const baseData = [
          t.ticketNo || 'N/A',
          t.status || 'N/A',
          t.projectName || 'N/A',
          t.subject || 'N/A',
        ];
        
        const hoursData = [
          Number(t.expectedHours) || 0,
          t.latestRequest?.hours ?? 0,
          t.latestRequest?.reason ?? 'N/A',
          t.completedTime ? new Date(t.completedTime).toLocaleString() : 'N/A'
        ];
        
        if (showEfinColumns) {
          const efinData = [
            isEfin ? (t.descriptionEfin1 || 'N/A') : '-',
            isEfin ? (t.descriptionEfin2 || 'N/A') : '-'
          ];
          return [...baseData, ...efinData, ...hoursData];
        } else {
          return [...baseData, ...hoursData];
        }
      }),
      ["", "", "", "", "", "", "", ""],
      ["Summary:", `Total Expected Hours: ${totalExpected}`, `Total Requested Hours: ${totalRequested}`, `Efin Tickets with Descriptions: ${efinTicketsWithDescriptions}`, "", "", "", ""]
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
              <h3 className="text-center fw-bold mb-4">
                Completed / Verified Tickets
                
              </h3>

              {/* Filters and Summary */}
              <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
                <Form.Control
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={handleSearch}
                  style={{ maxWidth: '300px' }}
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
                  <Button variant="success" onClick={exportToExcel}>
                    <i className="bi bi-file-excel me-2"></i>Export Excel
                  </Button>
                  <Button variant="primary" onClick={fetchTickets} disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" /> Refreshing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2"></i>Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              {!loading && !error && filteredTickets.length > 0 && (
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-primary text-white">
                      <div className="card-body">
                        <h6 className="card-title">Total Tickets</h6>
                        <h3>{filteredTickets.length}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-success text-white">
                      <div className="card-body">
                        <h6 className="card-title">Efin Tickets</h6>
                        <h3>{efinTickets.length}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info text-white">
                      <div className="card-body">
                        <h6 className="card-title">Other Tickets</h6>
                        <h3>{otherTicketsCount}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-warning text-white">
                      <div className="card-body">
                        <h6 className="card-title">Total Hours</h6>
                        <h3>{totalExpected}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading tickets...</p>
                </div>
              ) : currentRows.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
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
                          <th>#</th>
                          <th>Ticket No</th>
                          <th>Status</th>
                          <th>Project</th>
                          <th>Subject</th>
                          {/* Conditionally show Efin description columns */}
                          {showEfinColumns && (
                            <>
                              <th>Efin Description 1</th>
                              <th>Efin Description 2</th>
                            </>
                          )}
                          <th>Expected Hours</th>
                          <th>Requested Hours</th>
                          <th>Reason</th>
                          <th>Completed Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.map((ticket, index) => {
                          const isEfin = ticket.projectName?.toLowerCase() === 'efin';
                          
                          return (
                            <motion.tr
                              key={ticket._id || `${ticket.ticketNo}-${index}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2, delay: index * 0.03 }}
                              className={isEfin ? 'table-info' : ''}
                            >
                              <td>{indexOfFirstRow + index + 1}</td>
                              <td>
                                <strong>{ticket.ticketNo ?? 'N/A'}</strong>
                              </td>
                              <td>{getStatusBadge(ticket.status)}</td>
                              <td>
                                {isEfin ? (
                                  <Badge bg="info" className="text-dark">Efin</Badge>
                                ) : (
                                  ticket.projectName ?? 'N/A'
                                )}
                              </td>
                              <td>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>{ticket.subject || 'N/A'}</Tooltip>}
                                >
                                  <span>{truncateText(ticket.subject, 30)}</span>
                                </OverlayTrigger>
                              </td>
                              
                              {/* Efin Description Columns - Only shown for Efin projects */}
                              {showEfinColumns && (
                                <>
                                  <td>
                                    {isEfin ? (
                                      ticket.descriptionEfin1 ? (
                                        <OverlayTrigger
                                          placement="top"
                                          overlay={<Tooltip>{ticket.descriptionEfin1}</Tooltip>}
                                        >
                                          <span className="text-primary">
                                            <i className="bi bi-file-text me-1"></i>
                                            {truncateText(ticket.descriptionEfin1, 20)}
                                          </span>
                                        </OverlayTrigger>
                                      ) : (
                                        <span className="text-muted fst-italic">
                                          <i className="bi bi-dash-circle me-1"></i>
                                          Not provided
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                  <td>
                                    {isEfin ? (
                                      ticket.descriptionEfin2 ? (
                                        <OverlayTrigger
                                          placement="top"
                                          overlay={<Tooltip>{ticket.descriptionEfin2}</Tooltip>}
                                        >
                                          <span className="text-success">
                                            <i className="bi bi-file-text me-1"></i>
                                            {truncateText(ticket.descriptionEfin2, 20)}
                                          </span>
                                        </OverlayTrigger>
                                      ) : (
                                        <span className="text-muted fst-italic">
                                          <i className="bi bi-dash-circle me-1"></i>
                                          Not provided
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                </>
                              )}
                              
                              <td className="text-center">
                                <Badge bg="secondary" pill>
                                  {Number(ticket.expectedHours) || 0}
                                </Badge>
                              </td>
                              <td className="text-center">
                                {ticket.latestRequest?.hours ? (
                                  <Badge bg="warning" pill className="text-dark">
                                    {ticket.latestRequest.hours}
                                  </Badge>
                                ) : (
                                  <span className="text-muted">0</span>
                                )}
                              </td>
                              <td>
                                {ticket.latestRequest?.reason ? (
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip>{ticket.latestRequest.reason}</Tooltip>}
                                  >
                                    <span>{truncateText(ticket.latestRequest.reason, 20)}</span>
                                  </OverlayTrigger>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td>
                                {ticket.completedTime ? (
                                  <small>
                                    {new Date(ticket.completedTime).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </small>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                        
                        {/* Summary Row */}
                        <tr className="fw-bold bg-light">
                          <td colSpan={showEfinColumns ? "5" : "4"} className="text-end">Total</td>
                          {showEfinColumns && (
                            <>
                              <td>-</td>
                              <td>-</td>
                            </>
                          )}
                          <td className="text-center">{totalExpected}</td>
                          <td className="text-center">{totalRequested}</td>
                          <td colSpan="2">-</td>
                        </tr>
                        
                        {/* Efin Summary Row - Only shown if there are Efin tickets */}
                        {efinTickets.length > 0 && (
                          <tr className="bg-info bg-opacity-10">
                            <td colSpan={showEfinColumns ? "4" : "3"} className="text-end text-primary">
                              <i className="bi bi-info-circle me-2"></i>
                              Efin tickets with descriptions:
                            </td>
                            {showEfinColumns && (
                              <>
                                <td className="text-primary fw-bold">{efinTicketsWithDescriptions}</td>
                                <td>-</td>
                              </>
                            )}
                            <td colSpan="4" className="text-primary">
                              (Out of {efinTickets.length} total Efin tickets)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <div className="text-muted">
                        Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredTickets.length)} of {filteredTickets.length} entries
                      </div>
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