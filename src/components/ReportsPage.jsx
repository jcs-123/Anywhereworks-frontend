import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Table, Card, Form, Badge, Spinner } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import axios from 'axios';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ReportsPage = () => {
  const [showCompleteReportModal, setShowCompleteReportModal] = useState(false);
  const [worklogs, setWorklogs] = useState([]);
  const [filteredWorklogs, setFilteredWorklogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    developer: '',
    startDate: '',
    endDate: '',
    project: ''
  });
  const [developers, setDevelopers] = useState([]);
  const [projects, setProjects] = useState([]);

  // API base URL
  const API_BASE_URL = 'https://anywhereworks-backend.onrender.com';

  // Fetch completed worklogs
const fetchCompletedWorklogs = async () => {
  setLoading(true);
  try {
    // First fetch all worklogs
    const response = await axios.get(`${API_BASE_URL}/daily-worklogs`);
    
    if (response.data.success) {
      // Filter only completed worklogs that are NOT blocked
      const completedWorklogs = response.data.data.filter(
        worklog => worklog.devstatus === 'completed' && worklog.hide !== 'block'
      );
      
      setWorklogs(completedWorklogs);
      setFilteredWorklogs(completedWorklogs);
      
      // Extract unique developers and projects
      const devs = [...new Set(completedWorklogs.map(item => item.developer))];
      const projs = [...new Set(completedWorklogs.flatMap(item => 
        item.tickets ? item.tickets.map(t => t.project).filter(Boolean) : []
      ))];
      
      setDevelopers(devs);
      setProjects(projs);
    } else {
      console.error('Failed to fetch worklogs');
      toast.error('Failed to fetch worklogs');
    }
  } catch (error) {
    console.error('Error fetching worklogs:', error);
    toast.error('Error fetching worklogs');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchCompletedWorklogs();
  }, []);

  // Bulk hide function
  const bulkBlockWorklogs = async () => {
    if (filteredWorklogs.length === 0) {
      toast.warning("No worklogs to block.");
      return;
    }

    try {
      const ids = filteredWorklogs.map(w => w._id);
      await axios.post(`${API_BASE_URL}/bulk-update-hide`, {
        ids,
        hide: "block"
      });

      toast.success("✅ All filtered worklogs blocked successfully!");
      // Refresh list after update
      fetchCompletedWorklogs();
    } catch (error) {
      console.error("Error blocking worklogs:", error);
      toast.error("❌ Failed to block worklogs");
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...worklogs];
    
    if (filters.developer) {
      filtered = filtered.filter(w => w.developer === filters.developer);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(w => new Date(w.date) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(w => new Date(w.date) <= new Date(filters.endDate));
    }
    
    if (filters.project) {
      filtered = filtered.filter(w => 
        w.tickets && w.tickets.some(t => t.project === filters.project)
      );
    }
    
    setFilteredWorklogs(filtered);
  }, [filters, worklogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      developer: '',
      startDate: '',
      endDate: '',
      project: ''
    });
  };

  // Export to Excel
  const exportToExcel = () => {
    const dataForExport = filteredWorklogs.map(worklog => ({
      Date: new Date(worklog.date).toLocaleDateString(),
      Developer: worklog.developer,
      'Hours Worked': worklog.hoursWorked,
      'Daily Target': worklog.dailyTarget,
      Status: worklog.status,
      'Day Type': worklog.dayType,
      'Tickets Count': worklog.tickets ? worklog.tickets.length : 0,
      'Dev Status': worklog.devstatus
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Worklogs Report');
    XLSX.writeFile(workbook, 'worklogs_report.xlsx');
    toast.success('Excel report downloaded successfully!');
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Worklogs Report', 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    // Table data
    const tableData = filteredWorklogs.map(worklog => [
      new Date(worklog.date).toLocaleDateString(),
      worklog.developer,
      worklog.hoursWorked,
      worklog.dailyTarget,
      worklog.status,
      worklog.dayType,
      worklog.tickets ? worklog.tickets.length : 0,
      worklog.devstatus
    ]);
    
    // Table columns
    const tableColumns = [
      'Date', 
      'Developer', 
      'Hours Worked', 
      'Daily Target', 
      'Status', 
      'Day Type', 
      'Tickets Count', 
      'Dev Status'
    ];
    
    // Add table
    autoTable(doc, {
      head: [tableColumns],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 140, 0] }
    });

    doc.save('worklogs_report.pdf');
    toast.success('PDF report downloaded successfully!');
  };

  // Full-page modal component
  const CompleteReportModal = ({ show, onHide }) => {
    return (
      <Modal 
        show={show} 
        onHide={onHide} 
        size="xl"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        className="full-page-modal"
      >
        <Modal.Header closeButton className="bg-orange text-white">
          <Modal.Title id="contained-modal-title-vcenter">
            Complete Report 
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" className="text-orange">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <>
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Developer</Form.Label>
                    <Form.Select
                      value={filters.developer}
                      onChange={(e) => handleFilterChange('developer', e.target.value)}
                    >
                      <option value="">All Developers</option>
                      {developers.map((dev, index) => (
                        <option key={index} value={dev}>{dev}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Project</Form.Label>
                    <Form.Select
                      value={filters.project}
                      onChange={(e) => handleFilterChange('project', e.target.value)}
                    >
                      <option value="">All Projects</option>
                      {projects.map((proj, index) => (
                        <option key={index} value={proj}>{proj}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>From Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>To Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col className="d-flex justify-content-end">
                  <Button 
                    variant="danger" 
                    onClick={bulkBlockWorklogs} 
                    className="me-2"
                  >
                    Block All 
                  </Button>
                  <Button variant="outline-secondary" onClick={resetFilters} className="me-2">
                    Reset Filters
                  </Button>
                  <Button variant="outline-success" onClick={exportToExcel} className="me-2">
                    Export to Excel
                  </Button>
                  <Button variant="outline-danger" onClick={exportToPDF}>
                    Export to PDF
                  </Button>
                </Col>
              </Row>
              
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Developer</th>
                      <th>Hours Worked</th>
                      <th>Daily Target</th>
                      <th>Status</th>
                      <th>Day Type</th>
                      <th>Tickets</th>
                      <th>Dev Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorklogs.length > 0 ? (
                      filteredWorklogs.map((worklog, index) => (
                        <tr key={index}>
                          <td>{new Date(worklog.date).toLocaleDateString()}</td>
                          <td>{worklog.developer}</td>
                          <td>{worklog.hoursWorked}</td>
                          <td>{worklog.dailyTarget}</td>
                          <td>
                            <Badge bg={worklog.status === 'Yes' ? 'success' : 'danger'}>
                              {worklog.status}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={
                              worklog.dayType === 'working' ? 'primary' : 
                              worklog.dayType === 'weekend' ? 'info' : 
                              worklog.dayType === 'holiday' ? 'warning' : 'secondary'
                            }>
                              {worklog.dayType}
                            </Badge>
                          </td>
                          <td>
                            {worklog.tickets && worklog.tickets.map((ticket, i) => (
                              <div key={i} className="small">
                                {ticket.ticketNo && <Badge bg="secondary" className="me-1">{ticket.ticketNo}</Badge>}
                                {ticket.title} ({ticket.hours}h)
                                {ticket.project && <Badge bg="info" className="ms-1">{ticket.project}</Badge>}
                              </div>
                            ))}
                          </td>
                          <td>
                            <Badge bg={worklog.devstatus === 'completed' ? 'success' : 'warning'}>
                              {worklog.devstatus}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">No completed worklogs found</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              
              <Row className="mt-3">
                <Col>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Summary</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={3} className="text-center">
                          <h6>Total Records</h6>
                          <h3 className="text-primary">{filteredWorklogs.length}</h3>
                        </Col>
                        <Col md={3} className="text-center">
                          <h6>Total Hours</h6>
                          <h3 className="text-success">
                            {filteredWorklogs.reduce((sum, w) => sum + parseFloat(w.hoursWorked || 0), 0)}
                          </h3>
                        </Col>
                        <Col md={3} className="text-center">
                          <h6>Developers</h6>
                          <h3 className="text-info">
                            {[...new Set(filteredWorklogs.map(w => w.developer))].length}
                          </h3>
                        </Col>
                        <Col md={3} className="text-center">
                          <h6>Projects</h6>
                          <h3 className="text-warning">
                            {[...new Set(filteredWorklogs.flatMap(w => 
                              w.tickets ? w.tickets.map(t => t.project) : []).filter(Boolean))].length}
                          </h3>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            style={{backgroundColor: '#ff8c00', borderColor: '#ff8c00'}} 
            onClick={onHide}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h1 className="mb-4">Work Reports</h1>
          <Card className="mb-4">
            <Card.Body>
              <Button 
                variant="orange" 
                size="lg" 
                onClick={() => setShowCompleteReportModal(true)}
                className="p-2"
                style={{backgroundColor: '#ff8c00', borderColor: '#ff8c00'}}
              >
                View Complete Report 
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Complete Report Modal */}
      <CompleteReportModal 
        show={showCompleteReportModal} 
        onHide={() => setShowCompleteReportModal(false)} 
      />
      
      {/* Add CSS for full-page modal */}
      <style jsx>{`
        :global(.full-page-modal) {
          max-width: 95% !important;
          width: 95% !important;
          height: 90vh !important;
          margin: 5vh auto !important;
        }
        :global(.full-page-modal .modal-content) {
          height: 100%;
        }
        :global(.full-page-modal .modal-body) {
          overflow-y: auto;
        }
        :global(.bg-orange) {
          background-color: #ff8c00 !important;
        }
        .text-orange {
          color: #ff8c00 !important;
        }
      `}</style>
    </Container>
  );
};

export default ReportsPage;