import React, { useEffect, useState } from 'react';
import {
  Button, Table, Pagination, Form, Row, Col, Container, Badge, ButtonGroup, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

function RequestStatus() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [responseNotes, setResponseNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('https://anywhereworks-backend.onrender.com/ticketrequest');
        const onlyRequested = res.data.data
          .filter(item => item.timeRequests?.length > 0)
          .map(item => {
            const lastRequest = item.timeRequests[item.timeRequests.length - 1];
            return {
              id: item._id,
              ticketNo: item.ticketNo,
              projectName: item.projectName,
              expectedHours: item.expectedHours,
              requestedHours: lastRequest.hours,
              reason: lastRequest.reason,
              status: lastRequest.status,
              responseNote: lastRequest.responseNote || '',
              assignedTo: item.assignedTo,
              assignedBy: item.assignedBy,
              description: item.description,
              ticketType: item.ticketType
            };
          });

        setData(onlyRequested);
      } catch (err) {
        toast.error('Failed to load ticket requests');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = data.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter.charAt(0).toUpperCase() + filter.slice(1);
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const createNewTicket = async (requestData) => {
    try {
      const response = await axios.post('https://anywhereworks-backend.onrender.com/assign', {
        projectName: requestData.projectName,
        subject: `Extension for Ticket ${requestData.ticketNo}`,
        description: requestData.description,
        expectedHours: requestData.requestedHours,
        assignedTo: requestData.assignedTo,
        assignedBy: requestData.assignedBy,
        ticketType: requestData.ticketType,
        isExtension: true,
        originalTicketId: requestData.id
      });
      return response.data.ticket;
    } catch (error) {
      console.error('Error creating new ticket:', error);
      throw error;
    }
  };

  const updateStatus = async (id, status) => {
    const note = responseNotes[id] || '';
    try {
      const requestData = data.find(item => item.id === id);
      
      // First update the status
      await axios.post('https://anywhereworks-backend.onrender.com/ticketrequest/update-status', {
        ticketId: id,
        status,
        responseNote: note
      });

      // If approved, create a new ticket
      if (status === 'Approved' && requestData) {
        await createNewTicket(requestData);
      }

      // Update local state
      setData(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status, responseNote: note } : item
        )
      );

      toast.success(`Request ${status.toLowerCase()} for Ticket ID ${id}`);
      setResponseNotes(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      toast.error('Failed to update request status');
      console.error(err);
    }
  };

  const handleResponseNoteChange = (id, note) => {
    setResponseNotes(prev => ({ ...prev, [id]: note }));
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      'Ticket ID': item.ticketNo,
      'Project': item.projectName,
      'Expected Hours': item.expectedHours,
      'Requested Hours': item.requestedHours,
      'Reason': item.reason,
      'Status': item.status,
      'Response Note': item.responseNote || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requests');
    XLSX.writeFile(wb, 'request_status.xlsx');
    toast.success('Excel report generated');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Request Status Report', 105, 15, { align: 'center' });
    doc.text(`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`, 105, 22, { align: 'center' });

    autoTable(doc, {
      head: [['#', 'Ticket No', 'Project', 'Expected Hours', 'Requested Hours', 'Reason', 'Status', 'Response']],
      body: filteredData.map((item, idx) => [
        idx + 1,
        item.ticketNo,
        item.projectName,
        item.expectedHours,
        item.requestedHours,
        item.reason,
        item.status,
        item.responseNote || '-'
      ]),
      startY: 30,
    });
    doc.save('request_status.pdf');
    toast.success('PDF report generated');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <Badge bg="success">Approved</Badge>;
      case 'Rejected': return <Badge bg="danger">Rejected</Badge>;
      default: return <Badge bg="warning">Pending</Badge>;
    }
  };

  return (
    <div>
      <Header />
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <Container fluid>
            <Row className="mb-3 justify-content-between align-items-center">
              <Col md={4}><h4 className="fw-bold">Extra Time Request Status</h4></Col>
              <Col className="text-end">
                <ButtonGroup className="me-3">
                  {['all', 'approved', 'rejected', 'pending'].map(f => (
                    <Button
                      key={f}
                      variant={filter === f ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
                </ButtonGroup>
                <Button variant="outline-success" size="sm" onClick={exportToPDF} className="me-2">
                  Export PDF
                </Button>
                <Button variant="outline-primary" size="sm" onClick={exportToExcel}>
                  Export Excel
                </Button>
              </Col>
            </Row>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <div className="table-responsive shadow-sm rounded bg-white p-3">
                <Table bordered hover responsive className="align-middle">
                  <thead className="table-dark text-center">
                    <tr>
                      <th>#</th>
                      <th>Ticket No</th>
                      <th>Project</th>
                      <th>Expected Hours</th>
                      <th>Requested Hours</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    {currentItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{indexOfFirst + index + 1}</td>
                        <td>{item.ticketNo}</td>
                        <td className="text-start">{item.projectName}</td>
                        <td>{item.expectedHours}</td>
                        <td>{item.requestedHours}</td>
                        <td>{item.reason}</td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td>
                          {item.status === 'Pending' ? (
                            <>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Response note"
                                value={responseNotes[item.id] || ''}
                                onChange={(e) => handleResponseNoteChange(item.id, e.target.value)}
                                className="mb-2"
                              />
                              <div className="d-flex gap-2 justify-content-center">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => updateStatus(item.id, 'Approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => updateStatus(item.id, 'Rejected')}
                                >
                                  Reject
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-muted small">
                              {item.status === 'Approved' ? (
                                <>
                                  <span className="text-success">✓ Approved</span><br />
                                  {item.responseNote && <span>Note: {item.responseNote}</span>}
                                </>
                              ) : (
                                <>
                                  <span className="text-danger">✗ Rejected</span><br />
                                  {item.responseNote && <span>Note: {item.responseNote}</span>}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {filteredData.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No requests found for this filter.
                  </div>
                )}

                {totalPages > 1 && (
                  <Pagination className="justify-content-center mt-3">
                    <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} />
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Pagination.Item key={i} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
                    <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                  </Pagination>
                )}
              </div>
            )}
          </Container>
        </main>
      </div>
    </div>
  );
}

export default RequestStatus;