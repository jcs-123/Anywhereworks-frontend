import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Row, Col, Table, Pagination, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TimeRequestModal from '../components/TimeRequestModal';

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [timeRequestTicket, setTimeRequestTicket] = useState(null);
  const [showTimeRequestModal, setShowTimeRequestModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false); // For file operations

  const user = JSON.parse(localStorage.getItem('user'));
  const userName = user?.name || 'User';
const [ticketTypeFilter, setTicketTypeFilter] = useState('All');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get('http://localhost:4000/tickets');
        setTickets(response.data.tickets || []);
      } catch (error) {
        toast.error('❌ Error fetching tickets');
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, []);

  // Filter out verified tickets and apply search
  const filteredTickets = tickets
  .filter(ticket =>
    ticket.assignedTo?.toLowerCase().includes(userName.toLowerCase()) &&
    ticket.status !== 'Verified' &&
    (ticketTypeFilter === 'All' || ticket.ticketType === ticketTypeFilter)
  )
  .filter(ticket => {
    const fields = [
      ticket.ticketNumber || ticket.ticketNo || '',
      ticket.projectName || '',
      ticket.subject || '',
      ticket.status || '',
      ticket.assignedTo || '',
      String(ticket.expectedHours || ''),
      new Date(ticket.createdAt).toLocaleDateString('en-IN'),
      ticket.ticketType || '',
    ]
      .join(' ')
      .toLowerCase();
    return fields.includes(searchTerm.toLowerCase());
  });

    // Count of non-completed tickets (excluding Verified and Completed)
const notCompletedCount = tickets.filter(
  (ticket) =>
    ticket.assignedTo?.toLowerCase().includes(userName.toLowerCase()) &&
    ['Assigned', 'Working', 'Pending'].includes(ticket.status)
).length;


  // Pagination logic remains the same
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const paginate = pageNumber => setCurrentPage(pageNumber);

  // Status color mapping
  function getStatusColor(status) {
    switch (status) {
      case 'Raised': return '#6c757d';
      case 'Assigned': return '#0d6efd';
      case 'Working': return '#fd7e14';
      case 'Pending': return '#ffc107';
      case 'Completed': return '#198754';
      case 'Verified': return '#6f42c1';
      default: return '#6c757d';
    }
  }

  // Improved file handling functions
  const handleViewFile = async (filename) => {
    if (!filename) {
      toast.warning('No file attached to this ticket');
      return;
    }
    
    try {
      setFileLoading(true);
      const fileUrl = `http://localhost:4000/uploads/${filename}`;
      
      // Check if the file exists
      const response = await fetch(fileUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('File not found');
      }
      
      window.open(fileUrl, '_blank');
    } catch (error) {
      toast.error('❌ Failed to view file');
      console.error('File view error:', error);
    } finally {
      setFileLoading(false);
    }
  };

  const handleDownloadFile = async (filename) => {
    if (!filename) {
      toast.warning('No file attached to this ticket');
      return;
    }
    
    try {
      setFileLoading(true);
      const fileUrl = `http://localhost:4000/uploads/${filename}`;
      
      // Check if the file exists
      const response = await fetch(fileUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('File not found');
      }
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('❌ Failed to download file');
      console.error('Download error:', error);
    } finally {
      setFileLoading(false);
    }
  };

  // Rest of your export functions remain the same...
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTickets);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, 'tickets.xlsx');
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTickets);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tickets.csv';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Assigned Tickets Report', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });

    const tableData = filteredTickets.map((ticket, i) => [
      i + 1,
      ticket.ticketNumber || ticket.ticketNo || 'N/A',
      ticket.projectName,
      ticket.subject,
      ticket.status,
      ticket.assignedTo,
      ticket.assignedBy || 'N/A',
      ticket.expectedHours,
      ticket.file ? 'Yes' : 'No',
      new Date(ticket.createdAt).toLocaleDateString('en-IN'),
    ]);

    autoTable(doc, {
      head: [['#', 'Ticket ID', 'Project', 'Subject', 'Status', 'Assigned To', 'Assigned By', 'Hours', 'File', 'Date']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 93, 181], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save('assigned_tickets_report.pdf');
  };

  const handlePrint = () => {
    const content = document.getElementById('printArea').innerHTML;
    const win = window.open('', '', 'width=900,height=700');
    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Tickets</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
          <style>@media print { .no-print { display: none } }</style>
        </head>
        <body>
          <h3 class="text-center">Tickets Report</h3>
          <p class="text-center">Generated on: ${new Date().toLocaleDateString()}</p>
          ${content}
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSaveStatus = async () => {
    try {
      const response = await axios.put(`http://localhost:4000/tickets/${selectedTicket._id}`, {
        status: selectedTicket.status,
      });

      const updatedTicket = response.data.ticket;

      setTickets(prev =>
        prev.map(t =>
          t._id === updatedTicket._id ? updatedTicket : t
        )
      );

      toast.success('✅ Status updated successfully');
      setSelectedTicket(null);
    } catch (error) {
      toast.error('❌ Failed to update status');
      console.error('Status update error:', error);
    }
  };

  return (
    <div>
      <Header />
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="d-flex min-vh-100">
<Sidebar notCompletedCount={notCompletedCount} />
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h3 className="mb-4 fw-bold">Assigned Tickets</h3>


            {/* Search and Export */}
          <Row className="mb-3 justify-content-between align-items-center">
  {/* Search Input */}
  <Col md={4} className="mb-2">
    <Form.Group controlId="searchInput">
      <div className="input-group">
        <Form.Control
          type="text"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        {searchTerm && (
          <Button variant="outline-secondary" size="sm" onClick={() => setSearchTerm('')}>
            <i className="bi bi-x" />
          </Button>
        )}
      </div>
    </Form.Group>
  </Col>

  {/* Ticket Type Dropdown */}
  <Col md={3} className="mb-2">
    <Form.Group controlId="typeFilter">
      <Form.Select
        value={ticketTypeFilter}
        onChange={(e) => {
          setTicketTypeFilter(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="All">All Types</option>
        <option value="Development">Development</option>
        <option value="Maintenance">Maintenance</option>
      </Form.Select>
    </Form.Group>
  </Col>

  {/* Export Buttons */}
  <Col md={5} className="text-end mb-2">
    <Button variant="outline-success" size="sm" className="me-2" onClick={exportToPDF}>
      <i className="bi bi-file-earmark-pdf" /> PDF
    </Button>
    <Button variant="outline-info" size="sm" className="me-2" onClick={exportToExcel}>
      <i className="bi bi-file-earmark-excel" /> Excel
    </Button>
    <Button variant="outline-secondary" size="sm" className="me-2" onClick={exportToCSV}>
      <i className="bi bi-file-earmark-text" /> CSV
    </Button>
    <Button variant="outline-primary" size="sm" onClick={handlePrint}>
      <i className="bi bi-printer" /> Print
    </Button>
  </Col>
</Row>

            {/* Ticket Table */}
            <div id="printArea" className="table-responsive bg-white p-3 rounded shadow-sm">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center text-muted">No tickets found.</div>
              ) : (
                <>
                  <Table bordered hover responsive>
                    <thead className="table-dark text-center">
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                        <th>Ticket ID</th>
                        <th>Project</th>
                        <th>Subject</th>
                        <th>Uploads</th>
                        <th>Date</th>
                        <th>Hours</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {currentTickets.map((ticket, i) => (
                        <tr key={ticket._id}>
                          <td>{indexOfFirstTicket + i + 1}</td>
                          <td>
                            <motion.span
                              className="badge rounded-pill"
                              style={{ backgroundColor: getStatusColor(ticket.status), cursor: 'pointer' }}
                              whileHover={{ scale: 1.1 }}
                            >
                              {ticket.status}
                            </motion.span>
                          </td>
                          <td>{ticket.ticketNo || ticket.ticketNumber}</td>
                          <td>{ticket.projectName}</td>
                          <td>{ticket.subject}</td>
                          <td>
                            {ticket.file ? (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleViewFile(ticket.file)}
                                disabled={fileLoading}
                              >
                                {fileLoading ? 'Loading...' : 'View'}
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>{ticket.expectedHours}</td>
                          <td className="d-flex gap-2 justify-content-center">
                            <Button variant="outline-primary" size="sm" onClick={() => setSelectedTicket(ticket)}>
                              <i className="bi bi-eye" />
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setTimeRequestTicket(ticket);
                                setShowTimeRequestModal(true);
                              }}
                            >
                              <i className="bi bi-clock-history" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  {filteredTickets.length > ticketsPerPage && (
                    <Pagination className="justify-content-center">
                      <Pagination.First onClick={() => paginate(1)} disabled={currentPage === 1} />
                      <Pagination.Prev onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Pagination.Item key={i} active={i + 1 === currentPage} onClick={() => paginate(i + 1)}>
                          {i + 1}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} />
                      <Pagination.Last onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} />
                    </Pagination>
                  )}
                </>
              )}
            </div>

            {/* Ticket Details Modal */}
            <Modal show={!!selectedTicket} onHide={() => setSelectedTicket(null)} centered size="lg">
              <Modal.Header closeButton className="bg-dark text-white">
                <Modal.Title>Ticket Details</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedTicket && (
                  <>
                    <Row>
                      <Col md={6}>
                        <p><strong>ID:</strong> {selectedTicket.ticketNo || selectedTicket.ticketNumber}</p>
                        <p><strong>Project:</strong> {selectedTicket.projectName}</p>
                        <p><strong>Subject:</strong> {selectedTicket.subject}</p>
                        <Form.Group>
                          <Form.Label><strong>Status:</strong></Form.Label>
                          <Form.Select
                            value={selectedTicket.status}
                            onChange={(e) =>
                              setSelectedTicket({ ...selectedTicket, status: e.target.value })
                            }
                          >
                                                        <option>Select</option>

                            <option value="Working">Working</option>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <p><strong>Assigned To:</strong> {selectedTicket.assignedTo}</p>
                        <p><strong>Assigned By:</strong> {selectedTicket.assignedBy}</p>
                        <p><strong>Hours:</strong> {selectedTicket.expectedHours}</p>
                        <p><strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                      </Col>
                    </Row>
                    <Row>
                      <Col>
                        <p><strong>Description:</strong></p>
                        <div className="border p-2 rounded bg-light">{selectedTicket.description}</div>
                      </Col>
                    </Row>
                    {selectedTicket.file && (
                      <Row className="mt-4">
                        <Col>
                          <p><strong>Uploaded File:</strong></p>
                          <div className="d-flex gap-2 mb-3">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewFile(selectedTicket.file)}
                              disabled={fileLoading}
                            >
                              {fileLoading ? 'Loading...' : '🔍 View File'}
                            </Button>
                           
                          </div>

                       
                          {selectedTicket.file.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i) && (
                            <div className="mt-3">
                              <img
                                src={`http://localhost:4000/uploads/${selectedTicket.file}`}
                                alt="Uploaded"
                                className="img-fluid border rounded"
                                style={{ 
                                  maxHeight: '400px',
                                  display: fileLoading ? 'none' : 'block'
                                }}
                              />
                              {fileLoading && (
                                <div className="text-center py-4">
                                  <Spinner animation="border" variant="primary" />
                                  <p>Loading image preview...</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Col>
                      </Row>
                    )}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setSelectedTicket(null)}>Close</Button>
                <Button variant="primary" onClick={handleSaveStatus}>Save</Button>
              </Modal.Footer>
            </Modal>

            {/* Time Request Modal */}
            <TimeRequestModal
              show={showTimeRequestModal}
              onHide={() => {
                setShowTimeRequestModal(false);
                setTimeRequestTicket(null);
              }}
              ticket={timeRequestTicket}
              userId={user?._id}
              toast={toast}
            />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default Tickets;