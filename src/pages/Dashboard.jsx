import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Row, Col, Table, Pagination, Badge, Form, Alert, Card,
  Button
} from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  FiClock, FiCalendar, FiTrendingUp, FiUser, FiAlertCircle, 
  FiDownload, FiList, FiCheckCircle, FiShield
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [devStats, setDevStats] = useState({ assigned: 0, working: 0, pending: 0 });
  const [maintStats, setMaintStats] = useState({ assigned: 0, working: 0, pending: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('All');
  const [timeRange, setTimeRange] = useState('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');
  const ticketsPerPage = 10;
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userName = user?.name || 'User';
  const userRole = user?.role || 'employee';
  const userEmail = user?.email || user?.gmail;

  const COLORS = {
    assigned: '#3a0ca3',
    working: '#f8961e',
    pending: '#f94144',
    completed: '#43aa8b',
    verified: '#4cc9f0'
  };

  // Fetch all data - FAST LOADING
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) throw new Error('User not found');
        
        const userEmail = user.email || user.gmail;
        if (!userEmail) throw new Error('User email not found');
        
        // Fetch all tickets data
        const res = await axios.get('https://anywhereworks-backend.onrender.com/getdashboardata', {
          timeout: 5000 // 5 second timeout for faster response
        });
        const allTicketsData = res.data.tickets || [];
        
        // Set all tickets (for admin export and statistics)
        setAllTickets(allTicketsData);
        
        // Separate logic for Admin vs Employee
        let filteredData = [];
        let devStatsData = { assigned: 0, working: 0, pending: 0 };
        let maintStatsData = { assigned: 0, working: 0, pending: 0 };
        
        if (userRole === 'admin') {
          // ========== ADMIN LOGIC ==========
          // For TABLE VIEW: Only show Assigned, Working, Pending (NOT Completed or Verified)
          const activeTicketsForTable = allTicketsData.filter(t => 
            t.status === 'Assigned' || t.status === 'Working' || t.status === 'Pending'
          );
          
          filteredData = activeTicketsForTable;
          
          // Calculate stats for development (only active tickets for charts)
          const devTickets = activeTicketsForTable.filter(t => t.ticketType === 'Development');
          devStatsData = {
            assigned: devTickets.filter(t => t.status === 'Assigned').length,
            working: devTickets.filter(t => t.status === 'Working').length,
            pending: devTickets.filter(t => t.status === 'Pending').length
          };
          
          // Calculate stats for maintenance (only active tickets for charts)
          const maintTickets = activeTicketsForTable.filter(t => t.ticketType === 'Maintenance');
          maintStatsData = {
            assigned: maintTickets.filter(t => t.status === 'Assigned').length,
            working: maintTickets.filter(t => t.status === 'Working').length,
            pending: maintTickets.filter(t => t.status === 'Pending').length
          };
          
        } else {
          // ========== EMPLOYEE LOGIC ==========
          const currentUserEmail = String(userEmail).toLowerCase().trim();
          
          // Employee: show ALL their tickets (including Completed/Verified)
          filteredData = allTicketsData.filter(t => {
            const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
            return assignedTo === currentUserEmail;
          });
          
          // For employee, calculate stats from their ALL tickets
          const devTickets = filteredData.filter(t => t.ticketType === 'Development');
          devStatsData = {
            assigned: devTickets.filter(t => t.status === 'Assigned').length,
            working: devTickets.filter(t => t.status === 'Working').length,
            pending: devTickets.filter(t => t.status === 'Pending').length
          };
          
          const maintTickets = filteredData.filter(t => t.ticketType === 'Maintenance');
          maintStatsData = {
            assigned: maintTickets.filter(t => t.status === 'Assigned').length,
            working: maintTickets.filter(t => t.status === 'Working').length,
            pending: maintTickets.filter(t => t.status === 'Pending').length
          };
        }
        
        setDevStats(devStatsData);
        setMaintStats(maintStatsData);
        setFilteredTickets(filteredData);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userRole, userEmail]);

  // Filter tickets when filters change
  useEffect(() => {
    if (allTickets.length === 0) return;
    
    let filtered = [];
    
    if (userRole === 'admin') {
      // ========== ADMIN FILTERING ==========
      // Start with ONLY active tickets for table view
      filtered = allTickets.filter(t => 
        t.status === 'Assigned' || t.status === 'Working' || t.status === 'Pending'
      );
      
    } else {
      // ========== EMPLOYEE FILTERING ==========
      const currentUserEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
      
      // Employee: show ALL their tickets (including Completed/Verified)
      filtered = allTickets.filter(t => {
        const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
        return assignedTo === currentUserEmail;
      });
    }
    
    // Apply status filter
    if (filterType !== 'All') {
      filtered = filtered.filter(t => t.status === filterType);
    }
    
    // Apply time range filter
    const now = new Date();
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate > oneWeekAgo;
      });
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate > oneMonthAgo;
      });
    }
    
    // Apply ticket type filter
    if (ticketTypeFilter !== 'All') {
      filtered = filtered.filter(t => t.ticketType === ticketTypeFilter);
    }
    
    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [filterType, timeRange, ticketTypeFilter, allTickets, userRole, userEmail]);

  // Calculate working days
  const calculateWorkingDays = useCallback((expectedHours = 0, requestedHours = 0) => {
    const totalHours = expectedHours + requestedHours;
    return totalHours ? Math.ceil(totalHours / 6) : 0;
  }, []);

  // Calculate statistics - DIFFERENT FOR ADMIN VS EMPLOYEE
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
    
    if (userRole === 'admin') {
      // ========== ADMIN STATISTICS ==========
      // Calculate from ALL tickets (including Completed/Verified)
      const totalTickets = allTickets.length;
      const assigned = allTickets.filter(t => t.status === 'Assigned').length;
      const working = allTickets.filter(t => t.status === 'Working').length;
      const completed = allTickets.filter(t => t.status === 'Completed').length;
      const verified = allTickets.filter(t => t.status === 'Verified').length;
      const pending = allTickets.filter(t => t.status === 'Pending').length;
      const development = allTickets.filter(t => t.ticketType === 'Development').length;
      const maintenance = allTickets.filter(t => t.ticketType === 'Maintenance').length;
      
      // Calculate hours from ACTIVE tickets only (for efficiency)
      const activeTickets = allTickets.filter(t => 
        t.status === 'Assigned' || t.status === 'Working' || t.status === 'Pending'
      );
      
      const expectedHours = activeTickets.reduce((sum, ticket) => sum + (ticket.expectedHours || 0), 0);
      const requestedHours = activeTickets.reduce((sum, ticket) => {
        const lastReq = ticket.timeRequests?.[0] || {};
        return sum + (lastReq.hours || 0);
      }, 0);
      
      const workingDays = calculateWorkingDays(expectedHours, requestedHours);
      const efficiency = expectedHours > 0 
        ? Math.min(100, Math.round((requestedHours / expectedHours) * 100))
        : 0;
      
      return {
        totalTickets,
        assigned,
        working,
        completed,
        verified,
        pending,
        development,
        maintenance,
        expectedHours,
        requestedHours,
        workingDays,
        efficiency,
        myTickets: filteredTickets.length // Active tickets for admin
      };
      
    } else {
      // ========== EMPLOYEE STATISTICS ==========
      const currentUserEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
      
      // Employee: calculate from their tickets only
      const myTickets = allTickets.filter(t => {
        const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
        return assignedTo === currentUserEmail;
      });
      
      const totalTickets = myTickets.length;
      const assigned = myTickets.filter(t => t.status === 'Assigned').length;
      const working = myTickets.filter(t => t.status === 'Working').length;
      const completed = myTickets.filter(t => t.status === 'Completed').length;
      const verified = myTickets.filter(t => t.status === 'Verified').length;
      const pending = myTickets.filter(t => t.status === 'Pending').length;
      const development = myTickets.filter(t => t.ticketType === 'Development').length;
      const maintenance = myTickets.filter(t => t.ticketType === 'Maintenance').length;
      
      const expectedHours = myTickets.reduce((sum, ticket) => sum + (ticket.expectedHours || 0), 0);
      const requestedHours = myTickets.reduce((sum, ticket) => {
        const lastReq = ticket.timeRequests?.[0] || {};
        return sum + (lastReq.hours || 0);
      }, 0);
      
      const workingDays = calculateWorkingDays(expectedHours, requestedHours);
      const efficiency = expectedHours > 0 
        ? Math.min(100, Math.round((requestedHours / expectedHours) * 100))
        : 0;
      
      return {
        totalTickets,
        assigned,
        working,
        completed,
        verified,
        pending,
        development,
        maintenance,
        expectedHours,
        requestedHours,
        workingDays,
        efficiency,
        myTickets: totalTickets
      };
    }
  }, [allTickets, filteredTickets, userRole, userEmail, calculateWorkingDays]);

  // Prepare chart data
  const chartData = useMemo(() => (stats = {}) => [
    { name: 'Assigned', value: stats.assigned || 0, color: COLORS.assigned },
    { name: 'Working', value: stats.working || 0, color: COLORS.working },
    { name: 'Pending', value: stats.pending || 0, color: COLORS.pending }
  ], [COLORS]);

  // Export ALL tickets to Excel (admin only)
  const exportAllTicketsToExcel = useCallback(() => {
    if (allTickets.length === 0) {
      alert('No tickets to export');
      return;
    }
    
    // Prepare data for export - includes ALL tickets
    const formattedData = allTickets.map(ticket => {
      const lastReq = ticket.timeRequests?.[0] || {};
      const daysWorked = calculateWorkingDays(ticket.expectedHours || 0, lastReq.hours || 0);
      
      return {
        'Ticket No': ticket.ticketNo || '',
        'Status': ticket.status || '',
        'Assigned To': ticket.assignedTo || '',
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

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Tickets");
    
    // Auto-size columns
    const wscols = [
      {wch: 12}, {wch: 12}, {wch: 20}, {wch: 15}, {wch: 20},
      {wch: 30}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 12},
      {wch: 30}, {wch: 15}, {wch: 40}, {wch: 20}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `All_Tickets_Export_${timestamp}.xlsx`;
    
    // Export to Excel
    XLSX.writeFile(wb, fileName);
    
    alert(`✅ Successfully exported ${allTickets.length} tickets to Excel\n\n` +
          `📊 Complete Breakdown:\n` +
          `• Assigned: ${statistics.assigned}\n` +
          `• Working: ${statistics.working}\n` +
          `• Completed: ${statistics.completed}\n` +
          `• Verified: ${statistics.verified}\n` +
          `• Pending: ${statistics.pending}`);
  }, [allTickets, calculateWorkingDays, statistics]);

  // Get current page tickets
  const currentTickets = useMemo(() => 
    filteredTickets.slice(
      (currentPage - 1) * ticketsPerPage,
      currentPage * ticketsPerPage
    ),
    [filteredTickets, currentPage, ticketsPerPage]
  );

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
                      Export All Tickets to Excel
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Stats Row 1 - DIFFERENT FOR ADMIN VS EMPLOYEE */}
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

            {/* Stats Row 2 - Ticket Types and Hours */}
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

            {/* Charts - DIFFERENT FOR ADMIN VS EMPLOYEE */}
            {userRole === 'admin' ? (
              <Row className="mb-4">
                <Col md={6}>
                  <ChartCard 
                    title="Active Development Tickets" 
                    data={chartData(devStats)}
                    total={devStats.assigned + devStats.working + devStats.pending}
                    subtitle="Only active tickets shown (Assigned, Working, Pending)"
                  />
                </Col>
                <Col md={6}>
                  <ChartCard 
                    title="Active Maintenance Tickets" 
                    data={chartData(maintStats)}
                    total={maintStats.assigned + maintStats.working + maintStats.pending}
                    subtitle="Only active tickets shown (Assigned, Working, Pending)"
                  />
                </Col>
              </Row>
            ) : (
              <Row className="mb-4">
                <Col md={6}>
                  <ChartCard 
                    title="My Development Tickets" 
                    data={chartData(devStats)}
                    total={devStats.assigned + devStats.working + devStats.pending}
                    subtitle="Your development tickets status"
                  />
                </Col>
                <Col md={6}>
                  <ChartCard 
                    title="My Maintenance Tickets" 
                    data={chartData(maintStats)}
                    total={maintStats.assigned + maintStats.working + maintStats.pending}
                    subtitle="Your maintenance tickets status"
                  />
                </Col>
              </Row>
            )}

            {/* Tickets Table - DIFFERENT FOR ADMIN VS EMPLOYEE */}
            <div className="bg-white p-3 shadow rounded">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-0">
                    {userRole === 'admin' ? 'Active System Tickets' : 'My Tickets'} 
                    <Badge bg="secondary" className="ms-2">
                      {filteredTickets.length} {userRole === 'admin' ? 'active tickets' : 'tickets'}
                    </Badge>
                   
                  </h5>
                </div>
                <div className="d-flex gap-2 align-items-center">
         
                  
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
                              {userRole === 'admin' && <td>{t.assignedTo || 'Unassigned'}</td>}
                              <td>
                                <Badge bg={t.ticketType === 'Development' ? 'info' : 'success'}>
                                  {t.ticketType || '-'}
                                </Badge>
                              </td>
                              <td>{t.projectName || '-'}</td>
                              <td>{t.subject || '-'}</td>
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

const ChartCard = React.memo(({ title, data, total, subtitle }) => (
  <div className="bg-white p-3 rounded shadow-sm h-100">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h6 className="mb-0">{title}</h6>
      {total !== undefined && (
        <Badge bg="secondary">Total: {total}</Badge>
      )}
    </div>
    {subtitle && <p className="text-muted small mb-3">{subtitle}</p>}
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          label={({ name, value }) => `${name}: ${value}`}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Tickets']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
));

export default Dashboard;