import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Button, Modal, Form, Row, Col, Table, 
  Pagination, Spinner, Badge 
} from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TimeRequestModal from '../components/TimeRequestModal';

// Constants
const API_BASE_URL = 'https://anywhereworks-backend.onrender.com';
const TICKETS_PER_PAGE = 8;
const STATUS_COLORS = {
  Raised: '#6c757d',
  Assigned: '#0d6efd',
  Working: '#fd7e14',
  Pending: '#ffc107',
  Completed: '#198754',
  Verified: '#6f42c1'
};

const TICKET_TYPES = ['All', 'Development', 'Maintenance'];
const EDITABLE_STATUSES = ['Working', 'Pending', 'Completed'];

function Tickets() {
  // State Management
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [timeRequestTicket, setTimeRequestTicket] = useState(null);
  const [showTimeRequestModal, setShowTimeRequestModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [showEfinEditModal, setShowEfinEditModal] = useState(false);
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');
  const [efinDescriptions, setEfinDescriptions] = useState({
    descriptionEfin1: '',
    descriptionEfin2: ''
  });

  // Get current user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user?.name || 'User';

  // Fetch Tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/tickets`);
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

  // Memoized Values
  const notCompletedCount = useMemo(() => 
    tickets.filter(ticket => 
      ticket.assignedTo?.toLowerCase().includes(userName.toLowerCase()) &&
      ['Assigned', 'Working', 'Pending'].includes(ticket.status)
    ).length,
    [tickets, userName]
  );

  const filteredTickets = useMemo(() => {
    return tickets
      .filter(ticket => 
        ticket.assignedTo?.toLowerCase().includes(userName.toLowerCase()) &&
        !['Verified', 'Completed'].includes(ticket.status) &&
        (ticketTypeFilter === 'All' || ticket.ticketType === ticketTypeFilter)
      )
      .filter(ticket => {
        const searchFields = [
          ticket.ticketNumber || ticket.ticketNo || '',
          ticket.projectName || '',
          ticket.subject || '',
          ticket.status || '',
          ticket.assignedTo || '',
          String(ticket.expectedHours || ''),
          new Date(ticket.createdAt).toLocaleDateString('en-IN'),
          ticket.ticketType || '',
        ].join(' ').toLowerCase();
        return searchFields.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const aId = String(a.ticketNumber || a.ticketNo || '');
        const bId = String(b.ticketNumber || b.ticketNo || '');
        return aId.localeCompare(bId, undefined, { numeric: true });
      });
  }, [tickets, userName, ticketTypeFilter, searchTerm]);

  // Pagination
  const paginationData = useMemo(() => {
    const indexOfLastTicket = currentPage * TICKETS_PER_PAGE;
    const indexOfFirstTicket = indexOfLastTicket - TICKETS_PER_PAGE;
    const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    
    return { indexOfFirstTicket, indexOfLastTicket, currentTickets, totalPages };
  }, [filteredTickets, currentPage]);

  // Helper Functions
  const getStatusColor = (status) => STATUS_COLORS[status] || '#6c757d';

  const handleFileOperation = useCallback(async (filename, operation) => {
    if (!filename) {
      toast.warning('No file attached to this ticket');
      return;
    }

    try {
      setFileLoading(true);
      const fileUrl = `${API_BASE_URL}/uploads/${filename}`;
      
      const response = await fetch(fileUrl, { method: 'HEAD' });
      if (!response.ok) throw new Error('File not found');

      if (operation === 'view') {
        window.open(fileUrl, '_blank');
      } else if (operation === 'download') {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast.error(`❌ Failed to ${operation} file`);
      console.error(`${operation} error:`, error);
    } finally {
      setFileLoading(false);
    }
  }, []);

  // CRUD Operations
  const handleSaveStatus = async () => {
    if (!selectedTicket) return;

    try {
      const response = await axios.put(`${API_BASE_URL}/tickets/${selectedTicket._id}`, {
        status: selectedTicket.status,
      });

      const updatedTicket = response.data.ticket;
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      toast.success('✅ Status updated successfully');
      setSelectedTicket(null);
    } catch (error) {
      toast.error('❌ Failed to update status');
      console.error('Status update error:', error);
    }
  };

  const handleSaveEfinDescriptions = async () => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/ticket/update-efin/${selectedTicket._id}`,
        efinDescriptions
      );

      const updatedTicket = response.data.data;
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      toast.success("✅ Efin descriptions updated");
      setShowEfinEditModal(false);
    } catch (error) {
      toast.error("❌ Failed to update Efin descriptions");
      console.error(error);
    }
  };

  // Export Functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTickets);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, 'tickets.xlsx');
    toast.success('✅ Excel file generated');
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTickets);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tickets.csv';
    link.click();
    toast.success('✅ CSV file generated');
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
    toast.success('✅ PDF file generated');
  };

  const handlePrint = () => {
    const content = document.getElementById('printArea')?.innerHTML;
    if (!content) return;

    const win = window.open('', '', 'width=900,height=700');
    win.document.write(`
      <html>
        <head>
          <title>Tickets</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
          <style>@media print { .no-print { display: none } }</style>
        </head>
        <body>
          <h3 class="text-center mt-4">Tickets Report</h3>
          <p class="text-center">Generated on: ${new Date().toLocaleDateString()}</p>
          ${content}
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // File Preview Component
  const FilePreview = ({ file, filename }) => {
    const fileUrl = `${API_BASE_URL}/uploads/${filename}`;
    const fileExtension = filename?.split('.').pop()?.toLowerCase();

    if (!filename) return null;

    const previewMap = {
      // Images
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image', 'webp': 'image',
      // Audio
      'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio', 'aac': 'audio', 'flac': 'audio',
      // Video
      'mp4': 'video',
      // PDF
      'pdf': 'pdf',
      // Documents
      'doc': 'document', 'docx': 'document', 'xls': 'document', 'xlsx': 'document', 
      'csv': 'document', 'txt': 'document',
      // Archives
      'zip': 'archive', 'rar': 'archive'
    };

    const fileType = previewMap[fileExtension] || 'other';

    const renderPreview = () => {
      switch (fileType) {
        case 'image':
          return (
            <div className="mt-3">
              <img
                src={fileUrl}
                alt="Uploaded"
                className="img-fluid border rounded"
                style={{ maxHeight: "400px", width: 'auto' }}
                onLoad={() => setFileLoading(false)}
                onError={() => setFileLoading(false)}
              />
            </div>
          );

        case 'audio':
          return (
            <div className="mt-3">
              <audio controls style={{ width: "100%" }} src={fileUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          );

        case 'video':
          return (
            <div className="mt-3">
              <video controls style={{ width: "100%", maxHeight: "400px" }} src={fileUrl} />
            </div>
          );

        case 'pdf':
          return (
            <div className="mt-3">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => window.open(fileUrl, "_blank")}
              >
                📄 Open PDF
              </Button>
            </div>
          );

        default:
          return (
            <div className="mt-3 border p-3 rounded bg-light">
              <p>📁 This file type cannot be previewed here.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleFileOperation(filename, 'download')}
              >
                ⬇ Download File
              </Button>
            </div>
          );
      }
    };

    return (
      <>
        {fileLoading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p>Loading file preview...</p>
          </div>
        )}
        {renderPreview()}
      </>
    );
  };

  return (
    <div className="tickets-container">
      <Header />
      <ToastContainer position="top-right" autoClose={1500} />
      
      <div className="d-flex min-vh-100">
        <Sidebar notCompletedCount={notCompletedCount} />
        
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="mb-4 fw-bold">Assigned Tickets</h3>

            {/* Search and Export Section */}
            <Row className="mb-3 justify-content-between align-items-center">
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
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setSearchTerm('')}
                      >
                        <i className="bi bi-x" />
                      </Button>
                    )}
                  </div>
                </Form.Group>
              </Col>

              <Col md={3} className="mb-2">
                <Form.Select
                  value={ticketTypeFilter}
                  onChange={(e) => {
                    setTicketTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {TICKET_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type === 'All' ? 'All Types' : type}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={5} className="text-end mb-2">
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  className="me-2" 
                  onClick={exportToPDF}
                  disabled={filteredTickets.length === 0}
                >
                  <i className="bi bi-file-earmark-pdf" /> PDF
                </Button>
                <Button 
                  variant="outline-info" 
                  size="sm" 
                  className="me-2" 
                  onClick={exportToExcel}
                  disabled={filteredTickets.length === 0}
                >
                  <i className="bi bi-file-earmark-excel" /> Excel
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2" 
                  onClick={exportToCSV}
                  disabled={filteredTickets.length === 0}
                >
                  <i className="bi bi-file-earmark-text" /> CSV
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={handlePrint}
                  disabled={filteredTickets.length === 0}
                >
                  <i className="bi bi-printer" /> Print
                </Button>
              </Col>
            </Row>

            {/* Tickets Table */}
            <div id="printArea" className="table-responsive bg-white p-3 rounded shadow-sm">
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                  No tickets found.
                </div>
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
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      <AnimatePresence>
                        {paginationData.currentTickets.map((ticket, i) => (
                          <motion.tr
                            key={ticket._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td>{paginationData.indexOfFirstTicket + i + 1}</td>
                            <td>
                              <Badge
                                bg="none"
                                className="rounded-pill"
                                style={{ 
                                  backgroundColor: getStatusColor(ticket.status),
                                  color: 'white',
                                  cursor: 'pointer',
                                  padding: '0.5em 0.8em'
                                }}
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                {ticket.status}
                              </Badge>
                            </td>
                            <td>{ticket.ticketNo || ticket.ticketNumber}</td>
                            <td>{ticket.projectName}</td>
                            <td className="text-truncate" style={{ maxWidth: '200px' }}>
                              {ticket.subject}
                            </td>
                            <td>
                              {ticket.file ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => handleFileOperation(ticket.file, 'view')}
                                  disabled={fileLoading}
                                >
                                  <i className="bi bi-paperclip"></i> View
                                </Button>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                            <td>{ticket.expectedHours}</td>
                            <td>
                              <div className="d-flex gap-2 justify-content-center">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => setSelectedTicket(ticket)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye" />
                                </Button>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => {
                                    setTimeRequestTicket(ticket);
                                    setShowTimeRequestModal(true);
                                  }}
                                  title="Request Time Extension"
                                >
                                  <i className="bi bi-clock-history" />
                                </Button>
                                {ticket.projectName === "Efin" && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTicket(ticket);
                                      setEfinDescriptions({
                                        descriptionEfin1: ticket.descriptionEfin1 || '',
                                        descriptionEfin2: ticket.descriptionEfin2 || ''
                                      });
                                      setShowEfinEditModal(true);
                                    }}
                                    title="Edit Efin Descriptions"
                                  >
                                    <i className="bi bi-pencil-square" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  {paginationData.totalPages > 1 && (
                    <Pagination className="justify-content-center mt-3">
                      <Pagination.First 
                        onClick={() => handlePageChange(1)} 
                        disabled={currentPage === 1} 
                      />
                      <Pagination.Prev 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1} 
                      />
                      {Array.from({ length: paginationData.totalPages }, (_, i) => (
                        <Pagination.Item
                          key={i + 1}
                          active={i + 1 === currentPage}
                          onClick={() => handlePageChange(i + 1)}
                        >
                          {i + 1}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === paginationData.totalPages} 
                      />
                      <Pagination.Last 
                        onClick={() => handlePageChange(paginationData.totalPages)} 
                        disabled={currentPage === paginationData.totalPages} 
                      />
                    </Pagination>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Ticket Details Modal */}
      <Modal 
        show={!!selectedTicket && !showEfinEditModal} 
        onHide={() => setSelectedTicket(null)} 
        centered 
        size="lg"
      >
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            <i className="bi bi-ticket-detailed me-2"></i>
            Ticket Details
          </Modal.Title>
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
                      <option value="">Select Status</option>
                      {EDITABLE_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
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
              
              <Row className="mt-3">
                <Col>
                  <p><strong>Description:</strong></p>
                  <div className="border p-3 rounded bg-light">
                    {selectedTicket.description || 'No description provided.'}
                  </div>
                </Col>
              </Row>

              {selectedTicket.file && (
                <Row className="mt-4">
                  <Col>
                    <p><strong>Attached File:</strong></p>
                    <div className="d-flex gap-2 mb-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleFileOperation(selectedTicket.file, 'view')}
                        disabled={fileLoading}
                      >
                        <i className="bi bi-eye"></i> View File
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleFileOperation(selectedTicket.file, 'download')}
                        disabled={fileLoading}
                      >
                        <i className="bi bi-download"></i> Download
                      </Button>
                    </div>
                    <FilePreview 
                      file={selectedTicket.file} 
                      filename={selectedTicket.file}
                    />
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSaveStatus}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Efin Edit Modal */}
      <Modal
        show={showEfinEditModal}
        onHide={() => setShowEfinEditModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-pencil-square me-2"></i>
            Edit Efin Descriptions
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Description Efin 1</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={efinDescriptions.descriptionEfin1}
              onChange={(e) =>
                setEfinDescriptions(prev => ({
                  ...prev,
                  descriptionEfin1: e.target.value
                }))
              }
              placeholder="Enter first description..."
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Description Efin 2</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={efinDescriptions.descriptionEfin2}
              onChange={(e) =>
                setEfinDescriptions(prev => ({
                  ...prev,
                  descriptionEfin2: e.target.value
                }))
              }
              placeholder="Enter second description..."
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEfinEditModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSaveEfinDescriptions}>
            Save Changes
          </Button>
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
    </div>
  );
}

export default Tickets;