import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Table, Card, Form, Button,
  Badge, Spinner, Modal, Alert, ProgressBar
} from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Report = () => {
  const [worklogs, setWorklogs] = useState([]);
  const [filteredWorklogs, setFilteredWorklogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    devstatus: '',
    dayType: '' // Added dayType filter
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorklog, setSelectedWorklog] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [newTicket, setNewTicket] = useState({ 
    ticketNo: '', 
    title: '', 
    hours: '', 
    project: '' // Added project field
  });
  const [projectList, setProjectList] = useState([]); // State for project list
  const [loadingProjects, setLoadingProjects] = useState(false); // Loading state for projects
 
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userEmail = user?.gmail;
  const userName = user?.name || 'User';
  const userRole = user?.role || 'employee';

  // API base URL
  const API_BASE_URL = 'https://anywhereworks-backend.onrender.com'; // Update with your API URL

  // Fetch project list from API
  useEffect(() => {
    setLoadingProjects(true);
    axios.get('https://anywhereworks-backend.onrender.com/all')
      .then(res => {
        setProjectList(res.data);
        setLoadingProjects(false);
      })
      .catch(err => {
        console.error('Failed to fetch projects', err);
        toast.error('Failed to load project list');
        setLoadingProjects(false);
      });
  }, []);

  // Fetch worklogs from API
  // const fetchWorklogs = async () => {
  //   setLoading(true);
  //   try {
  //     const params = new URLSearchParams({
  //       ...(filters.startDate && { startDate: filters.startDate.toISOString().split('T')[0] }),
  //       ...(filters.endDate && { endDate: filters.endDate.toISOString().split('T')[0] }),
  //       ...(filters.devstatus && { devstatus: filters.devstatus }),
  //       ...(filters.dayType && { dayType: filters.dayType }) // Added dayType filter
  //     });

  //     const response = await axios.get(`${API_BASE_URL}/daily-worklogs?${params}`);
      
  //     if (response.data.success) {
  //       // Filter worklogs to show only those matching the logged-in user's email
  //       const userWorklogs = response.data.data.filter(
  //         worklog => worklog.developer === userEmail
  //       );
        
  //       // Sort by date in descending order (newest first)
  //       const sortedData = userWorklogs.sort((a, b) => 
  //         new Date(b.date) - new Date(a.date)
  //       );
        
  //       setWorklogs(sortedData);
  //       setFilteredWorklogs(sortedData);
  //     } else {
  //       toast.error('Failed to fetch worklogs');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching worklogs:', error);
  //     toast.error('Error fetching worklogs');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
const fetchWorklogs = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      ...(filters.startDate && { startDate: filters.startDate.toISOString().split('T')[0] }),
      ...(filters.endDate && { endDate: filters.endDate.toISOString().split('T')[0] }),
      ...(filters.devstatus && { devstatus: filters.devstatus }),
      ...(filters.dayType && { dayType: filters.dayType })
    });

    const response = await axios.get(`${API_BASE_URL}/daily-worklogs?${params}`);
    
    if (response.data.success) {
      // Filter worklogs to show only those matching the logged-in user's email
      // AND exclude worklogs where hide === "block"
      const userWorklogs = response.data.data.filter(
        worklog => worklog.developer === userEmail && worklog.hide !== 'block'
      );
      
      // Sort by date in descending order (newest first)
      const sortedData = userWorklogs.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setWorklogs(sortedData);
      setFilteredWorklogs(sortedData);
    } else {
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
    fetchWorklogs();
  }, []);

  useEffect(() => {
    filterWorklogs();
  }, [filters, worklogs]);

  const filterWorklogs = () => {
    let filtered = [...worklogs];
    
    if (filters.startDate) {
      filtered = filtered.filter(w => new Date(w.date) >= filters.startDate);
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(w => new Date(w.date) <= filters.endDate);
    }
    
    if (filters.devstatus) {
      filtered = filtered.filter(w => w.devstatus === filters.devstatus);
    }
    
    if (filters.dayType) {
      filtered = filtered.filter(w => w.dayType === filters.dayType);
    }
    
    setFilteredWorklogs(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      devstatus: '',
      dayType: ''
    });
    fetchWorklogs();
  };

  const handleApplyFilters = () => {
    fetchWorklogs();
  };

  const handleEdit = (worklog) => {
    // Don't allow editing for holidays
    if (worklog.dayType === 'holiday') {
      toast.info('Cannot edit holiday entries');
      return;
    }
    
    setSelectedWorklog({
      ...worklog,
      // Ensure tickets array exists
      tickets: worklog.tickets || []
    });
    setShowEditModal(true);
    setNewTicket({ ticketNo: '', title: '', hours: '', project: '' });
  };

  const handleSaveEdit = async () => {
    try {
      // Auto-update status based on hours worked
      const updatedWorklog = {
        ...selectedWorklog,
        status: selectedWorklog.hoursWorked >= 6 ? 'Yes' : 'No'
      };

      const response = await axios.put(
        `${API_BASE_URL}/daily-worklogs/${updatedWorklog._id}`,
        updatedWorklog
      );
      
      if (response.data.success) {
        toast.success('Worklog updated successfully');
        setShowEditModal(false);
        fetchWorklogs();
      } else {
        toast.error('Failed to update worklog');
      }
    } catch (error) {
      console.error('Error updating worklog:', error);
      toast.error('Error updating worklog');
    }
  };

  const handleAddTicket = () => {
    if (!newTicket.title || !newTicket.hours || !newTicket.project) {
      toast.error('Please fill all ticket fields including project');
      return;
    }

    const updatedWorklog = {
      ...selectedWorklog,
      tickets: [...(selectedWorklog.tickets || []), newTicket],
      hoursWorked: (parseFloat(selectedWorklog.hoursWorked) || 0) + parseFloat(newTicket.hours)
    };

    setSelectedWorklog(updatedWorklog);
    setNewTicket({ ticketNo: '', title: '', hours: '', project: '' });
  };

  const handleRemoveTicket = (index) => {
    const ticketToRemove = selectedWorklog.tickets[index];
    const updatedTickets = [...selectedWorklog.tickets];
    updatedTickets.splice(index, 1);

    const updatedWorklog = {
      ...selectedWorklog,
      tickets: updatedTickets,
      hoursWorked: Math.max(0, (parseFloat(selectedWorklog.hoursWorked) || 0) - parseFloat(ticketToRemove.hours))
    };

    setSelectedWorklog(updatedWorklog);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);

    try {
      // Update only "notcomplete" worklogs that are not holidays
      const idsToUpdate = filteredWorklogs
        .filter(worklog => worklog.devstatus === 'notcomplete')
        .map(worklog => worklog._id);

      if (idsToUpdate.length > 0) {
        const updateResponse = await axios.post(`${API_BASE_URL}/daily-worklogs/devstatus`, {
          ids: idsToUpdate,
          devstatus: 'completed'
        });

        if (updateResponse.data.success) {
          toast.success(`Updated devstatus for ${updateResponse.data.data.modifiedCount} worklogs`);

          // Refresh the worklogs list after update
          fetchWorklogs();
        } else {
          toast.error('Failed to update devstatus');
        }
      } else {
        toast.info('No worklogs needed updating');
      }

    } catch (error) {
      console.error('Error updating worklogs devstatus:', error);
      toast.error('Error updating worklogs');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    return status === 'Yes' ? 'success' : 'danger';
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 100) return 'success';
    if (efficiency >= 80) return 'info';
    if (efficiency >= 60) return 'warning';
    return 'danger';
  };

  const getDayTypeBadge = (dayType) => {
    switch(dayType) {
      case 'holiday':
        return <Badge bg="danger">Holiday</Badge>;
      case 'weekend':
        return <Badge bg="info">Weekend</Badge>;
      case 'working':
        return <Badge bg="success">Working</Badge>;
      default:
        return <Badge bg="secondary">{dayType || 'Unknown'}</Badge>;
    }
  };

  return (
    <div>
      <Header />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <Container fluid className="py-4 report-container">
            
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* Header */}
            <Row className="mb-4">
              <Col>
                <h1 className="h2">Daily Work Hours Breakdown</h1>
                <p className="text-muted">{userEmail}</p>
              </Col>
            </Row>

            {/* Filters */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Filters</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>From Date</Form.Label>
                   <DatePicker
  selected={filters.startDate}
  onChange={(date) => handleFilterChange('startDate', date)}
  className="form-control"
  dateFormat="yyyy-MM-dd"
  placeholderText="Start date"
  isClearable
/>

                    </Form.Group>
                  </Col>
                  
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>To Date</Form.Label>
                     <DatePicker
  selected={filters.endDate}
  onChange={(date) => handleFilterChange('endDate', date)}
  className="form-control"
  dateFormat="yyyy-MM-dd"
  placeholderText="End date"
  isClearable
  minDate={filters.startDate}
/>

                    </Form.Group>
                  </Col>
                  
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Dev Status</Form.Label>
                      <Form.Select
                        value={filters.devstatus}
                        onChange={(e) => handleFilterChange('devstatus', e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="notcomplete">Not Complete</option>
                        <option value="completed">Completed</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Day Type</Form.Label>
                      <Form.Select
                        value={filters.dayType}
                        onChange={(e) => handleFilterChange('dayType', e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="working">Working</option>
                        <option value="weekend">Weekend</option>
                        <option value="holiday">Holiday</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={2} className="d-flex align-items-end">
                    <Button variant="outline-secondary" onClick={handleResetFilters} className="me-2">
                      Reset
                    </Button>
                    <Button variant="primary" onClick={handleApplyFilters}>
                      Apply
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Analysis Result */}
            {showAnalysis && analysisResult && (
              <Card className="mb-4 animate-fade-in">
                <Card.Header>
                  <h5 className="mb-0">Analysis Results</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={3}>
                      <div className="stat-card">
                        <h6>Total Hours Worked</h6>
                        <h3 className="text-primary">{analysisResult.totalHours || 0}h</h3>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="stat-card">
                        <h6>Average Hours/Day</h6>
                        <h3 className="text-info">{analysisResult.averageHours || 0}h</h3>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="stat-card">
                        <h6>Days Met Target</h6>
                        <h3 className="text-success">{analysisResult.completedDays || 0}/{analysisResult.totalDays || 0}</h3>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="stat-card">
                        <h6>Efficiency</h6>
                        <h3 className={`text-${getEfficiencyColor(analysisResult.efficiency || 0)}`}>
                          {analysisResult.efficiency ? analysisResult.efficiency.toFixed(2) : 0}%
                        </h3>
                        <ProgressBar 
                          now={analysisResult.efficiency || 0} 
                          variant={getEfficiencyColor(analysisResult.efficiency || 0)}
                          className="efficiency-bar"
                        />
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Worklogs Table */}
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Daily Work Hours</h5>
                <div>
                  <span className="text-muted me-3">
                    Showing {filteredWorklogs.length} records
                  </span>
                  <Button 
                    variant="primary" 
                    onClick={handleAnalyze} 
                    disabled={analyzing || filteredWorklogs.length === 0}
                    className="analyze-btn"
                  >
                    {analyzing ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Analyzing...
                      </>
                    ) : (
                      'Complete Analysis'
                    )}
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : filteredWorklogs.length > 0 ? (
                  <>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day Type</th>
                          <th>Developer</th>
                          <th>Hours Worked</th>
                          <th>Daily Target</th>
                          <th>Status</th>
                          <th>Tickets Completed</th>
                          <th>Dev Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorklogs.map((worklog) => (
                          <tr 
                            key={worklog._id} 
                            className={`animate-row ${worklog.dayType === 'holiday' ? 'table-danger' : ''}`}
                          >
                            <td>{formatDate(worklog.date)}</td>
                            <td>{getDayTypeBadge(worklog.dayType)}</td>
                            <td>{worklog.developer}</td>
                            <td>
                              <strong>{worklog.hoursWorked}h</strong>
                              {worklog.dayType !== 'holiday' && (
                                <ProgressBar 
                                  now={Math.min(worklog.hoursWorked, worklog.dailyTarget) / worklog.dailyTarget * 100} 
                                  variant={worklog.hoursWorked >= worklog.dailyTarget ? "success" : "warning"}
                                  className="mt-1"
                                  style={{height: '5px'}}
                                />
                              )}
                            </td>
                            <td>{worklog.dailyTarget}h</td>
                            <td>
                              <Badge bg={getStatusBadge(worklog.status)}>
                                {worklog.status}
                              </Badge>
                            </td>
                            <td>
                              {worklog.tickets && worklog.tickets.map((ticket, index) => (
                                <div key={index} className="ticket-item">
                                  <Badge bg="secondary" className="me-1">{ticket.ticketNo}</Badge>
                                  {ticket.title} 
                                  {ticket.project && <Badge bg="info" className="ms-1">{ticket.project}</Badge>}
                                  <span className="text-muted">({ticket.hours}h)</span>
                                </div>
                              ))}
                            </td>
                            <td>
                              <Badge bg={worklog.devstatus === 'completed' ? 'success' : 'warning'}>
                                {worklog.devstatus}
                              </Badge>
                            </td>
                            <td>
                              {worklog.dayType !== 'holiday' ? (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(worklog)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <span className="text-muted">No Edit</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : (
                  <Alert variant="warning">No worklogs found matching your filters.</Alert>
                )}
              </Card.Body>
            </Card>

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Edit Worklog</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedWorklog && (
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date</Form.Label>
                          <Form.Control type="text" value={formatDate(selectedWorklog.date)} disabled />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Developer</Form.Label>
                          <Form.Control type="text" value={selectedWorklog.developer} disabled />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Hours Worked</Form.Label>
                          <Form.Control 
                            type="number" 
                            value={selectedWorklog.hoursWorked}
                            onChange={(e) => {
                              const hours = parseFloat(e.target.value) || 0;
                              setSelectedWorklog({
                                ...selectedWorklog, 
                                hoursWorked: hours,
                                status: hours >= 6 ? 'Yes' : 'No'
                              });
                            }}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Status</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={selectedWorklog.status || 'No'} 
                            disabled
                            className={selectedWorklog.status === 'Yes' ? 'bg-success text-white' : 'bg-danger text-white'}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Add New Ticket */}
                    <Row className="mb-3">
                      <Col md={12}>
                        <h6>Add New Ticket</h6>
                      </Col>
                      
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>Ticket No (Optional)</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={newTicket.ticketNo}
                            onChange={(e) => setNewTicket({...newTicket, ticketNo: e.target.value})}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>Title</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={newTicket.title}
                            onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label>Project</Form.Label>
                          <Form.Select
                            value={newTicket.project}
                            onChange={(e) => setNewTicket({...newTicket, project: e.target.value})}
                          >
                            <option value="">Select Project</option>
                            {loadingProjects ? (
                              <option disabled>Loading projects...</option>
                            ) : (
                              projectList.map((project, index) => (
                                <option key={index} value={project.projectName}>
                                  {project.projectName}
                                </option>
                              ))
                            )}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label>Hours</Form.Label>
                          <Form.Control 
                            type="number" 
                            step="0.5"
                            value={newTicket.hours}
                            onChange={(e) => setNewTicket({...newTicket, hours: e.target.value})}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={2} className="d-flex align-items-end">
                        <Button variant="success" onClick={handleAddTicket}>
                          Add
                        </Button>
                      </Col>
                    </Row>

                    {/* Existing Tickets */}
                    {selectedWorklog.tickets && selectedWorklog.tickets.length > 0 && (
                      <Row>
                        <Col md={12}>
                          <h6>Current Tickets</h6>
                          <Table striped bordered size="sm">
                            <thead>
                              <tr>
                                <th>Ticket No</th>
                                <th>Title</th>
                                <th>Project</th>
                                <th>Hours</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedWorklog.tickets.map((ticket, index) => (
                                <tr key={index}>
                                  <td>{ticket.ticketNo}</td>
                                  <td>{ticket.title}</td>
                                  <td>{ticket.project}</td>
                                  <td>{ticket.hours}h</td>
                                  <td>
                                    <Button 
                                      variant="outline-danger" 
                                      size="sm"
                                      onClick={() => handleRemoveTicket(index)}
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Col>
                      </Row>
                    )}
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Report;