import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Row, Col, Table, Pagination, Badge, Form, Alert, Card,
  Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, FiCalendar, FiTrendingUp, FiUser, FiAlertCircle, 
  FiDownload, FiList, FiCheckCircle, FiShield, FiFilter,
  FiUsers, FiPieChart
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

// Developer options for filtering
const developerOptions = [
  { name: 'Merin', gmail: 'merinjdominic@jecc.ac.in' },
  { name: 'Sandra', gmail: 'sandraps@jecc.ac.in' },
  { name: 'Deepthi', gmail: 'deepthimohan@jecc.ac.in' },
  { name: 'Jeswin', gmail: 'jeswinjohn@jecc.ac.in' },
  { name: 'Pravitha', gmail: 'pravithacp@jecc.ac.in' },
  { name: 'Hima', gmail: 'himappradeep@jecc.ac.in' },
  { name: 'anjiya', gmail: 'anjiyapj@gmail.com' },
];

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('All');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');
  const [developerFilter, setDeveloperFilter] = useState('All');
  const ticketsPerPage = 10;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [developerStats, setDeveloperStats] = useState({});

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userName = user?.name || 'User';
  const userRole = user?.role || 'employee';
  const userEmail = user?.email || user?.gmail;

  // Fetch all data - OPTIMIZED FAST LOADING
  useEffect(() => {
    const fetchData = async () => {
      // Check if we already have data in localStorage for faster initial load
      const cachedData = localStorage.getItem('cachedTickets');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setAllTickets(parsedData);
            processData(parsedData);
            calculateDeveloperStats(parsedData);
          }
        } catch (e) {
          console.log('Cache parse error, fetching fresh data');
        }
      }

      setIsLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) throw new Error('User not found');
        
        const userEmail = user.email || user.gmail;
        if (!userEmail) throw new Error('User email not found');
        
        // Fetch all tickets data with cancellation token
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await axios.get('https://anywhereworks-backend.onrender.com/getdashboardata', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        const allTicketsData = res.data.tickets || [];
        
        // Cache the data for faster reloads
        localStorage.setItem('cachedTickets', JSON.stringify(allTicketsData));
        
        // Set all tickets
        setAllTickets(allTicketsData);
        calculateDeveloperStats(allTicketsData);
        processData(allTicketsData);
        setError(null);
        
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Request timeout. Please try again.');
        } else {
          console.error("Error fetching data:", err);
          setError(err.message || "Failed to load data");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    const processData = (data) => {
      let filteredData = [];
      
      if (userRole === 'admin') {
        // ADMIN: Show Assigned, Working, Pending
        filteredData = data.filter(t => 
          t.status === 'Assigned' || t.status === 'Working' || t.status === 'Pending'
        );
        
        // Apply developer filter if selected
        if (developerFilter !== 'All') {
          filteredData = filteredData.filter(t => 
            t.assignedTo?.toLowerCase() === developerFilter.toLowerCase()
          );
        }
        
      } else {
        // EMPLOYEE: Show their tickets
        const currentUserEmail = String(userEmail).toLowerCase().trim();
        filteredData = data.filter(t => {
          const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
          return assignedTo === currentUserEmail;
        });
      }
      
      setFilteredTickets(filteredData);
    };
    
    fetchData();
  }, [userRole, userEmail, developerFilter]);

  // Calculate developer statistics
  const calculateDeveloperStats = (tickets) => {
    const stats = {};
    
    // Initialize stats for all developers
    developerOptions.forEach(dev => {
      stats[dev.name] = {
        total: 0,
        assigned: 0,
        working: 0,
        completed: 0,
        verified: 0,
        pending: 0,
        hours: 0,
        email: dev.gmail
      };
    });
    
    // Calculate stats from tickets
    tickets.forEach(ticket => {
      const assignedEmail = ticket.assignedTo;
      if (!assignedEmail) return;
      
      const developer = developerOptions.find(d => d.gmail === assignedEmail);
      if (!developer) return;
      
      const devName = developer.name;
      
      // Update counts
      stats[devName].total++;
      stats[devName].hours += ticket.expectedHours || 0;
      
      // Update by status
      switch(ticket.status) {
        case 'Assigned': stats[devName].assigned++; break;
        case 'Working': stats[devName].working++; break;
        case 'Completed': stats[devName].completed++; break;
        case 'Verified': stats[devName].verified++; break;
        case 'Pending': stats[devName].pending++; break;
        default: break;
      }
    });
    
    setDeveloperStats(stats);
  };

  // Get developer name from email
  const getDeveloperName = useCallback((email) => {
    if (!email) return 'Unassigned';
    const developer = developerOptions.find(d => d.gmail === email);
    return developer?.name || email.split('@')[0] || email;
  }, []);

  // Optimized filter function
  const applyFilters = useCallback((data) => {
    let filtered = [];
    
    if (userRole === 'admin') {
      // Base filter for admin: active tickets
      filtered = data.filter(t => 
        t.status === 'Assigned' || t.status === 'Working' || t.status === 'Pending'
      );
      
      // Apply developer filter
      if (developerFilter !== 'All') {
        filtered = filtered.filter(t => 
          t.assignedTo?.toLowerCase() === developerFilter.toLowerCase()
        );
      }
    } else {
      const currentUserEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
      filtered = data.filter(t => {
        const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
        return assignedTo === currentUserEmail;
      });
    }
    
    // Apply status filter
    if (filterType !== 'All') {
      filtered = filtered.filter(t => t.status === filterType);
    }
    
    // Apply ticket type filter
    if (ticketTypeFilter !== 'All') {
      filtered = filtered.filter(t => t.ticketType === ticketTypeFilter);
    }
    
    return filtered;
  }, [userRole, userEmail, filterType, ticketTypeFilter, developerFilter]);

  // Optimized filter effect
  useEffect(() => {
    if (allTickets.length === 0) return;
    
    const filtered = applyFilters(allTickets);
    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [filterType, ticketTypeFilter, developerFilter, allTickets, applyFilters]);

  // Calculate working days
  const calculateWorkingDays = useCallback((expectedHours = 0, requestedHours = 0) => {
    const totalHours = expectedHours + requestedHours;
    return totalHours ? Math.ceil(totalHours / 8) : 0;
  }, []);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (allTickets.length === 0) return {
      totalTickets: 0,
      assigned: 0,
      working: 0,
      completed: 0,
      verified: 0,
      pending: 0,
      development: 0,
      maintenance: 0,
      expectedHours: 0,
      requestedHours: 0,
      workingDays: 0,
      efficiency: 0,
      myTickets: 0
    };
    
    const currentUserEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
    
    let stats = {
      totalTickets: 0,
      assigned: 0,
      working: 0,
      completed: 0,
      verified: 0,
      pending: 0,
      development: 0,
      maintenance: 0,
      expectedHours: 0,
      requestedHours: 0,
      workingDays: 0,
      efficiency: 0,
      myTickets: 0
    };
    
    const relevantTickets = userRole === 'admin' 
      ? allTickets 
      : allTickets.filter(t => {
          const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
          return assignedTo === currentUserEmail;
        });
    
    stats.totalTickets = relevantTickets.length;
    stats.myTickets = relevantTickets.length;
    
    relevantTickets.forEach(ticket => {
      switch(ticket.status) {
        case 'Assigned': stats.assigned++; break;
        case 'Working': stats.working++; break;
        case 'Completed': stats.completed++; break;
        case 'Verified': stats.verified++; break;
        case 'Pending': stats.pending++; break;
      }
      
      if (ticket.ticketType === 'Development') stats.development++;
      if (ticket.ticketType === 'Maintenance') stats.maintenance++;
      
      if (userRole === 'admin') {
        const isActive = ticket.status === 'Assigned' || ticket.status === 'Working' || ticket.status === 'Pending';
        if (isActive) {
          stats.expectedHours += ticket.expectedHours || 0;
          const lastReq = ticket.timeRequests?.[0] || {};
          stats.requestedHours += lastReq.hours || 0;
        }
      } else {
        stats.expectedHours += ticket.expectedHours || 0;
        const lastReq = ticket.timeRequests?.[0] || {};
        stats.requestedHours += lastReq.hours || 0;
      }
    });
    
    stats.workingDays = calculateWorkingDays(stats.expectedHours, stats.requestedHours);
    stats.efficiency = stats.expectedHours > 0 
      ? Math.min(100, Math.round((stats.requestedHours / stats.expectedHours) * 100))
      : 0;
    
    return stats;
  }, [allTickets, userRole, userEmail, calculateWorkingDays]);

  // Export ALL tickets to Excel
  const exportAllTicketsToExcel = useCallback(() => {
    if (allTickets.length === 0) {
      alert('No tickets to export');
      return;
    }
    
    const formattedData = allTickets.map(ticket => {
      const lastReq = ticket.timeRequests?.[0] || {};
      const daysWorked = calculateWorkingDays(ticket.expectedHours || 0, lastReq.hours || 0);
      const developerName = getDeveloperName(ticket.assignedTo);
      
      return {
        'Ticket No': ticket.ticketNo || '',
        'Status': ticket.status || '',
        'Assigned To': developerName,
        'Type': ticket.ticketType || '',
        'Project': ticket.projectName || '',
        'Subject': ticket.subject || '',
        'Priority': ticket.priority || '',
        'Expected Hours': ticket.expectedHours || 0,
        'Requested Hours': lastReq.hours || 0,
        'Days Worked': daysWorked,
        'Reason': lastReq.reason || '',
        'Created At': new Date(ticket.createdAt).toLocaleDateString(),
        'Description': ticket.description || '',
        'Verified By': ticket.verifiedBy || '',
        'Verification Date': ticket.verificationDate ? new Date(ticket.verificationDate).toLocaleDateString() : ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Tickets");
    
    const wscols = [
      {wch: 12}, {wch: 12}, {wch: 20}, {wch: 15}, {wch: 20},
      {wch: 30}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 12},
      {wch: 30}, {wch: 15}, {wch: 40}, {wch: 20}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `All_Tickets_Export_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    alert(`✅ Successfully exported ${allTickets.length} tickets to Excel`);
  }, [allTickets, calculateWorkingDays, getDeveloperName]);

  // Get current page tickets
  const currentTickets = useMemo(() => {
    if (filteredTickets.length === 0) return [];
    const start = (currentPage - 1) * ticketsPerPage;
    const end = start + ticketsPerPage;
    return filteredTickets.slice(start, end);
  }, [filteredTickets, currentPage, ticketsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const getStatusBadge = useCallback((status) => {
    const colors = {
      Assigned: 'primary',
      Working: 'warning',
      Completed: 'success',
      Verified: 'info',
      Pending: 'danger'
    };
    return <Badge bg={colors[status] || 'secondary'}>{status}</Badge>;
  }, []);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(currentPage - half, 1);
    let end = Math.min(start + maxButtons - 1, totalPages);

    if (end - start < maxButtons - 1) {
      start = Math.max(end - maxButtons + 1, 1);
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-end mt-3">
        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} />
        {pageNumbers}
        <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  // Render developer filter for admin
  const renderDeveloperFilter = () => {
    if (userRole !== 'admin') return null;
    
    return (
      <Form.Select
        size="sm"
        style={{ width: '180px' }}
        value={developerFilter}
        onChange={(e) => setDeveloperFilter(e.target.value)}
      >
        <option value="All">All Developers</option>
        {developerOptions.map(dev => (
          <option key={dev.gmail} value={dev.gmail}>{dev.name}</option>
        ))}
      </Form.Select>
    );
  };

  // Render developer stats cards
  const renderDeveloperStats = () => {
    if (userRole !== 'admin' || Object.keys(developerStats).length === 0) return null;
    
    return (
      <Row className="mb-4 g-2">
        <Col xs={12}>
          <Card className="shadow-sm border-0 bg-light">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <FiUsers size={20} className="text-primary me-2" />
                <h6 className="mb-0 fw-bold">Developer Performance Overview</h6>
              </div>
              <Row className="g-2">
                {Object.entries(developerStats).map(([name, stats]) => (
                  <Col md={3} key={name}>
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          <div>
                            <strong>{name}</strong><br/>
                            Total: {stats.total} tickets<br/>
                            Hours: {stats.hours.toFixed(1)}<br/>
                            Assigned: {stats.assigned} | Working: {stats.working}<br/>
                            Completed: {stats.completed} | Verified: {stats.verified}<br/>
                            Pending: {stats.pending}
                          </div>
                        </Tooltip>
                      }
                    >
                      <div className="bg-white p-2 rounded shadow-sm" style={{ cursor: 'pointer' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <strong className="text-primary small">{name}</strong>
                          <Badge bg="secondary" pill>{stats.total}</Badge>
                        </div>
                        <div className="d-flex gap-1 mt-1 small flex-wrap">
                          <Badge bg="primary" pill>{stats.assigned}</Badge>
                          <Badge bg="warning" pill>{stats.working}</Badge>
                          <Badge bg="success" pill>{stats.completed}</Badge>
                          <Badge bg="info" pill>{stats.verified}</Badge>
                          <Badge bg="danger" pill>{stats.pending}</Badge>
                        </div>
                        <div className="text-muted small">
                          <FiClock size={10} className="me-1" />
                          {stats.hours.toFixed(1)} hrs
                        </div>
                      </div>
                    </OverlayTrigger>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  if (!user) {
    return (
      <div className="text-center mt-5">
        <h3>Unauthorized</h3>
        <p>Please login to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-3 bg-light" style={{ minHeight: '100vh' }}>
          {error && (
            <Alert variant="danger" className="mb-4">
              <FiAlertCircle className="me-2" />
              {error}
            </Alert>
          )}

          {isLoading && (
            <div className="text-center mb-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading dashboard data...</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Welcome Message */}
            <div className="mb-4">
              <Card className="shadow-sm border-0 bg-primary text-white">
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4>Welcome back, {userName}!</h4>
                    <p className="mb-0">
                      {userRole === 'admin' 
                        ? 'Administrator Dashboard - Complete System Overview' 
                        : 'Your Personal Dashboard'}
                    </p>
                  </div>
                  {userRole === 'admin' && (
                    <Button
                      variant="light"
                      onClick={exportAllTicketsToExcel}
                      className="d-flex align-items-center gap-2"
                    >
                      <FiDownload size={18} />
                      Export All Tickets
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Developer Stats Cards - Only for Admin */}
            {renderDeveloperStats()}

            {/* Stats Row 1 */}
            <Row className="mb-4 g-3">
              <Col md={2}>
                <InfoCard 
                  title={userRole === 'admin' ? "Total Tickets" : "My Tickets"} 
                  value={statistics.totalTickets} 
                  variant="primary"
                  icon={<FiUser size={24} />}
                  subtitle={userRole === 'admin' ? "All system tickets" : "Your assigned tickets"}
                />
              </Col>
              <Col md={2}>
                <InfoCard 
                  title="Assigned" 
                  value={statistics.assigned} 
                  variant="primary"
                  icon={<FiUser size={24} />}
                  subtitle="To be worked on"
                />
              </Col>
              <Col md={2}>
                <InfoCard 
                  title="Working" 
                  value={statistics.working} 
                  variant="warning"
                  icon={<FiClock size={24} />}
                  subtitle="In progress"
                />
              </Col>
              <Col md={2}>
                <InfoCard 
                  title="Completed" 
                  value={statistics.completed} 
                  variant="success"
                  icon={<FiCheckCircle size={24} />}
                  subtitle="Work finished"
                />
              </Col>
              <Col md={2}>
                <InfoCard 
                  title="Verified" 
                  value={statistics.verified} 
                  variant="info"
                  icon={<FiShield size={24} />}
                  subtitle="Quality approved"
                />
              </Col>
              <Col md={2}>
                <InfoCard 
                  title="Pending" 
                  value={statistics.pending} 
                  variant="danger"
                  icon={<FiAlertCircle size={24} />}
                  subtitle="Awaiting action"
                />
              </Col>
            </Row>

            {/* Stats Row 2 */}
            <Row className="mb-4 g-3">
              <Col md={3}>
                <InfoCard 
                  title="Development" 
                  value={statistics.development} 
                  variant="info"
                  icon={<FiList size={24} />}
                  subtitle="Development tickets"
                />
              </Col>
              <Col md={3}>
                <InfoCard 
                  title="Maintenance" 
                  value={statistics.maintenance} 
                  variant="success"
                  icon={<FiList size={24} />}
                  subtitle="Maintenance tickets"
                />
              </Col>
              <Col md={3}>
                <InfoCard 
                  title="Working Days" 
                  value={statistics.workingDays} 
                  variant="primary"
                  icon={<FiCalendar size={24} />}
                  subtitle="Estimated work days"
                />
              </Col>
              <Col md={3}>
                <InfoCard 
                  title="Efficiency" 
                  value={`${statistics.efficiency}%`} 
                  variant={statistics.efficiency > 80 ? "success" : statistics.efficiency > 60 ? "warning" : "danger"}
                  icon={<FiTrendingUp size={24} />}
                  subtitle="Hours efficiency"
                />
              </Col>
            </Row>

            {/* Stats Row 3 - Hours */}
            <Row className="mb-4 g-3">
              <Col md={4}>
                <InfoCard 
                  title="Expected Hours" 
                  value={statistics.expectedHours.toFixed(1)} 
                  variant="info"
                  icon={<FiClock size={24} />}
                  subtitle="Planned hours"
                />
              </Col>
              <Col md={4}>
                <InfoCard 
                  title="Requested Hours" 
                  value={statistics.requestedHours.toFixed(1)} 
                  variant="success"
                  icon={<FiClock size={24} />}
                  subtitle="Actual hours spent"
                />
              </Col>
              <Col md={4}>
                <InfoCard 
                  title="Total Hours" 
                  value={(statistics.expectedHours + statistics.requestedHours).toFixed(1)} 
                  variant="primary"
                  icon={<FiClock size={24} />}
                  subtitle="Combined hours"
                />
              </Col>
            </Row>

            {/* Tickets Table */}
            <div className="bg-white p-3 shadow rounded">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h5 className="mb-0">
                    {userRole === 'admin' ? 'Active System Tickets' : 'My Tickets'} 
                    <Badge bg="secondary" className="ms-2">
                      {filteredTickets.length} {userRole === 'admin' ? 'active tickets' : 'tickets'}
                    </Badge>
                  </h5>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {/* Developer Filter - Only for Admin */}
                  {renderDeveloperFilter()}
                  
                  {/* Status Filter */}
                  <Form.Select
                    size="sm"
                    style={{ width: '150px' }}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Working">Working</option>
                    {userRole === 'employee' && (
                      <>
                        <option value="Completed">Completed</option>
                        <option value="Verified">Verified</option>
                      </>
                    )}
                    <option value="Pending">Pending</option>
                  </Form.Select>
                  
                  {/* Ticket Type Filter - Only for Admin */}
                  {userRole === 'admin' && (
                    <Form.Select
                      size="sm"
                      style={{ width: '150px' }}
                      value={ticketTypeFilter}
                      onChange={(e) => setTicketTypeFilter(e.target.value)}
                    >
                      <option value="All">All Types</option>
                      <option value="Development">Development</option>
                      <option value="Maintenance">Maintenance</option>
                    </Form.Select>
                  )}
                </div>
              </div>
              
              <div className="table-responsive">
                <Table bordered hover striped>
                  <thead className="bg-light">
                    <tr>
                      <th>Ticket No</th>
                      <th>Status</th>
                      {userRole === 'admin' && <th>Assigned To</th>}
                      <th>Type</th>
                      <th>Project</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Expected Hours</th>
                      <th>Requested Hours</th>
                      <th>Days Worked</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {currentTickets.length === 0 ? (
                        <tr>
                          <td colSpan={userRole === 'admin' ? 11 : 10} className="text-center py-4">
                            {userRole === 'admin' ? 'No active tickets found' : 'No tickets found'}
                          </td>
                        </tr>
                      ) : (
                        currentTickets.map((t, i) => {
                          const lastReq = t.timeRequests?.[0] || {};
                          const daysWorked = calculateWorkingDays(t.expectedHours || 0, lastReq.hours || 0);
                          const developerName = getDeveloperName(t.assignedTo);
                          
                          return (
                            <motion.tr
                              key={t.ticketNo || i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td className="fw-bold">{t.ticketNo}</td>
                              <td>{getStatusBadge(t.status)}</td>
                              {userRole === 'admin' && (
                                <td>
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip>{t.assignedTo || 'Unassigned'}</Tooltip>}
                                  >
                                    <Badge bg="info" pill style={{ cursor: 'pointer' }}>
                                      {developerName}
                                    </Badge>
                                  </OverlayTrigger>
                                </td>
                              )}
                              <td>
                                <Badge bg={t.ticketType === 'Development' ? 'info' : 'success'}>
                                  {t.ticketType || '-'}
                                </Badge>
                              </td>
                              <td>{t.projectName || '-'}</td>
                              <td>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>{t.subject}</Tooltip>}
                                >
                                  <span style={{ cursor: 'help' }}>
                                    {t.subject?.length > 20 ? t.subject.substring(0, 20) + '...' : t.subject || '-'}
                                  </span>
                                </OverlayTrigger>
                              </td>
                              <td>
                                <Badge bg={
                                  t.priority === 'High' ? 'danger' : 
                                  t.priority === 'Medium' ? 'warning' : 
                                  'secondary'
                                }>
                                  {t.priority || 'Low'}
                                </Badge>
                              </td>
                              <td className="text-center">{t.expectedHours ?? '-'}</td>
                              <td className="text-center">{lastReq.hours ?? '-'}</td>
                              <td className="text-center">{daysWorked || '-'}</td>
                              <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </tbody>
                </Table>
              </div>
              
              {filteredTickets.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    Showing {(currentPage - 1) * ticketsPerPage + 1} to {Math.min(currentPage * ticketsPerPage, filteredTickets.length)} of {filteredTickets.length} {userRole === 'admin' ? 'active tickets' : 'tickets'}
                  </div>
                  {renderPagination()}
                </div>
              )}
            </div>
            
            {/* Export Information for Admin Only */}
            {userRole === 'admin' && (
              <Card className="mt-4 border-success">
                <Card.Body className="text-center">
                  <h5 className="text-success mb-3">
                    <FiDownload className="me-2" />
                    Export Complete Ticket Database
                  </h5>
                  <div className="alert alert-info mb-3">
                    <strong>Note:</strong> Table shows only <strong>active tickets</strong> (Assigned, Working, Pending). 
                    The export includes <strong>ALL {statistics.totalTickets} tickets</strong> including:
                    <div className="mt-2">
                      <Badge bg="success" className="mx-1">Completed ({statistics.completed})</Badge>
                      <Badge bg="info" className="mx-1">Verified ({statistics.verified})</Badge>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={exportAllTicketsToExcel}
                    className="d-flex align-items-center gap-3 mx-auto px-4 py-2"
                  >
                    <FiDownload size={24} />
                    Download Complete Database ({statistics.totalTickets} Tickets)
                  </Button>
                  <p className="text-muted mt-3 mb-0">
                    Export includes Completed and Verified tickets (not shown in table above)
                  </p>
                </Card.Body>
              </Card>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// Memoized components
const InfoCard = React.memo(({ title, value, variant, icon, subtitle }) => (
  <div className={`bg-white rounded shadow-sm p-3 border-start border-5 border-${variant}`}>
    <div className="d-flex justify-content-between align-items-center">
      <div>
        <h6 className="text-muted mb-1">{title}</h6>
        <h3 className={`text-${variant} mb-0`}>{value}</h3>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </div>
      {icon && <div className={`text-${variant}`}>{icon}</div>}
    </div>
  </div>
));

export default Dashboard;