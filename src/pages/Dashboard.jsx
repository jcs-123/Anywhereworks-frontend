import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Row, Col, Table, Pagination, Spinner, Badge, Form, Alert, Card
} from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiClock, FiCalendar, FiTrendingUp, FiUser, FiAlertCircle } from 'react-icons/fi';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [devStats, setDevStats] = useState({});
  const [maintStats, setMaintStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('All');
  const [timeRange, setTimeRange] = useState('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');
  const ticketsPerPage = 5;
  const [error, setError] = useState(null);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userEmail = user?.email;
  const userName = user?.name || 'User';
  const userRole = user?.role || 'employee';

  const COLORS = {
    assigned: '#3a0ca3',
    working: '#f8961e',
    completed: '#43aa8b',
    pending: '#f94144',
    efficiency: '#4cc9f0'
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      
      // First verify we have valid user data
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        throw new Error('User not found in session');
      }

      // Use email or gmail field depending on what your app uses
      const userEmail = user.email || user.gmail;
      if (!userEmail) {
        throw new Error('User email not found in session');
      }
      
      // Safely normalize the email
      const currentUserEmail = String(userEmail).toLowerCase().trim();
      const res = await axios.get('https://anywhereworks-backend.onrender.com/getdashboardata');
      
      // Filter tickets - only show those assigned to current user's email
      let tickets = res.data.tickets || [];
      if (userRole === 'employee') {
        tickets = tickets.filter(t => {
          // Safely get and normalize assignedTo value
          const assignedTo = t.assignedTo ? String(t.assignedTo).toLowerCase().trim() : '';
          return assignedTo === currentUserEmail;
        });
      }
      
      setAllTickets(tickets);
      setFilteredTickets(tickets);
      setDevStats(res.data.development || {});
      setMaintStats(res.data.maintenance || {});
      setError(null);
    } catch (err) {
      console.error("Fetch failed:", err);
      setError(err.message || "Failed to load dashboard data");
      setAllTickets([]);
    } finally {
    }
  };

  fetchDashboardData();
}, [userRole]);
// Only depend on userRole since we get email fresh each time
useEffect(() => {
  let filtered = [...allTickets];

  // ✅ Filter by ticket status
  if (filterType !== 'All') {
    filtered = filtered.filter(t => t.status === filterType);
  }

  // ✅ Filter by time range
  const now = new Date();
  if (timeRange === 'week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(t => new Date(t.createdAt) > oneWeekAgo);
  } else if (timeRange === 'month') {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(t => new Date(t.createdAt) > oneMonthAgo);
  }

  // ✅ Filter by ticket type
  if (ticketTypeFilter !== 'All') {
    filtered = filtered.filter(t => t.ticketType === ticketTypeFilter);
  }

  // ✅ Set state
  setFilteredTickets(filtered);
  setCurrentPage(1);
}, [filterType, allTickets, timeRange, ticketTypeFilter]);

  // Calculate working days (6 hours = 1 day)
  const calculateWorkingDays = (expectedHours = 0, requestedHours = 0) => {
    const totalHours = expectedHours + requestedHours;
    return totalHours ? Math.ceil(totalHours / 6) : 0;
  };

  // Calculate statistics
  const totalTicketCount = filteredTickets.length;
  const completedCount = filteredTickets.filter(t => t.status === 'Completed').length;
  const pendingCount = filteredTickets.filter(t => t.status === 'Pending').length;
  const workingCount = filteredTickets.filter(t => t.status === 'Working').length;
  const developmentCount = filteredTickets.filter(t => t.ticketType === 'Development').length;
  const maintenanceCount = filteredTickets.filter(t => t.ticketType === 'Maintenance').length;
  const assignedCount = filteredTickets.filter(t => t.status === 'Assigned').length;
  
  // Calculate hours and days
  const totalExpectedHours = filteredTickets.reduce((sum, ticket) => sum + (ticket.expectedHours || 0), 0);
  const totalRequestedHours = filteredTickets.reduce((sum, ticket) => {
    const lastReq = ticket.timeRequests?.[0] || {};
    return sum + (lastReq.hours || 0);
  }, 0);
  
  const totalWorkingDays = calculateWorkingDays(totalExpectedHours, totalRequestedHours);
  const efficiencyPercentage = totalExpectedHours > 0 
    ? Math.min(100, Math.round((totalRequestedHours / totalExpectedHours) * 100))
    : 0;

  // Prepare data for charts
  const chartData = (stats = {}) => [
    { name: 'Assigned', value: stats.assigned || 0, color: COLORS.assigned },
    { name: 'Working', value: stats.working || 0, color: COLORS.working },
    { name: 'Completed', value: stats.completed || 0, color: COLORS.completed },
    { name: 'Pending', value: stats.pending || 0, color: COLORS.pending }
  ];

  const barChartData = [
    { name: 'Development', ...devStats },
    { name: 'Maintenance', ...maintStats }
  ];

  // Efficiency trend data (last 7 days)
  const efficiencyTrendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayTickets = filteredTickets.filter(t => {
      const ticketDate = new Date(t.createdAt);
      return ticketDate.toDateString() === date.toDateString();
    });
    const dayHours = dayTickets.reduce((sum, t) => sum + (t.timeRequests?.[0]?.hours || 0), 0);
    const dayExpected = dayTickets.reduce((sum, t) => sum + (t.expectedHours || 0), 0);
    const efficiency = dayExpected > 0 ? Math.min(100, Math.round((dayHours / dayExpected) * 100)) : 0;
    
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      efficiency
    };
  });

  const currentTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const getStatusBadge = (status) => {
    const colors = {
      Assigned: 'primary',
      Working: 'warning',
      Completed: 'success',
      Pending: 'danger'
    };
    return <Badge bg={colors[status] || 'secondary'}>{status}</Badge>;
  };

const renderPagination = () => {
  const pageNumbers = [];
  const maxButtons = 5;
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(currentPage - half, 1);
  let end = Math.min(start + maxButtons - 1, totalPages);

  // Adjust start if near the end
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
        <main className="flex-grow-1 p-3 bg-light">
          {error && (
            <Alert variant="danger" className="mb-4">
              <FiAlertCircle className="me-2" />
              {error}
            </Alert>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Welcome Message */}
            <motion.div variants={itemVariants} className="mb-4">
              <Card className="shadow-sm border-0 bg-primary text-white">
                <Card.Body>
                  <h4>Welcome back, {userName}!</h4>
                  <p className="mb-0">
                    {userRole === 'admin' 
                      ? 'Here is your admin dashboard overview' 
                      : 'Here are your current tickets and workload'}
                  </p>
                </Card.Body>
              </Card>
            </motion.div>

            {/* Stats Row 1 */}
            <Row className="mb-4 g-3">
              <Col md={userRole === 'admin' ? 2 : 3}>
                <InfoCard 
                  title="Total Tickets" 
                  value={totalTicketCount} 
                  variant="primary"
                  icon={<FiUser size={24} />}
                />
              </Col>
              <Col md={userRole === 'admin' ? 2 : 3}>
                <InfoCard 
                  title="Working" 
                  value={workingCount} 
                  variant="warning"
                  icon={<FiClock size={24} />}
                />
              </Col>
              <Col md={userRole === 'admin' ? 2 : 3}>
                <InfoCard 
                  title="Completed" 
                  value={completedCount} 
                  variant="success"
                  icon={<FiTrendingUp size={24} />}
                />
              </Col>
              {userRole === 'admin' && (
                <>
                  <Col md={2}>
                    <InfoCard title="Development" value={developmentCount} variant="info" />
                  </Col>
                  <Col md={2}>
                    <InfoCard title="Maintenance" value={maintenanceCount} variant="success" />
                  </Col>
                </>
              )}
            </Row>

            {/* Stats Row 2 - Hours and Days */}
            <Row className="mb-4 g-3">
              <Col md={4}>
                <InfoCard 
                  title="Expected Hours" 
                  value={totalExpectedHours.toFixed(1)} 
                  variant="info"
                  icon={<FiClock size={24} />}
                />
              </Col>
              <Col md={4}>
                <InfoCard 
                  title="Requested Hours" 
                  value={totalRequestedHours.toFixed(1)} 
                  variant="success"
                  icon={<FiClock size={24} />}
                />
              </Col>
              <Col md={4}>
                <InfoCard 
                  title="Working Days" 
                  value={totalWorkingDays} 
                  variant="primary"
                  icon={<FiCalendar size={24} />}
                />
              </Col>
            </Row>

            {/* Charts for Admin */}
            {userRole === 'admin' && (
              <Row className="mb-4">
                <Col md={6}>
                  <ChartCard title="Development Tickets" data={chartData(devStats)} />
                </Col>
                <Col md={6}>
                  <ChartCard title="Maintenance Tickets" data={chartData(maintStats)} />
                </Col>
              </Row>
            )}

            {/* Tickets Table */}
            <motion.div variants={itemVariants} className="bg-white p-3 shadow rounded">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>{userRole === 'admin' ? 'All Tickets' : 'My Tickets'}</h5>
                <div>
                  <Form.Select
                    size="sm"
                    style={{ width: '150px', display: 'inline-block', marginRight: '10px' }}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Working">Working</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </Form.Select>
                
                  {userRole === 'admin' && (
                    <Form.Select
                      size="sm"
                      style={{ width: '150px', display: 'inline-block' }}
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
              
              <Table bordered hover responsive>
                <thead>
                  <tr>
                    <th>Ticket No</th>
                    <th>Status</th>
                    {userRole === 'admin' && <th>Assigned To</th>}
                    <th>Type</th>
                    <th>Project</th>
                    <th>Subject</th>
                    <th>Expected Hours</th>
                    <th>Requested Hours</th>
                    <th>Days Worked</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {currentTickets.map((t, i) => {
                      const lastReq = t.timeRequests?.[0] || {};
                      const daysWorked = calculateWorkingDays(t.expectedHours || 0, lastReq.hours || 0);
                      
                      return (
                        <motion.tr
                          key={t.ticketNo || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td>{t.ticketNo}</td>
                          <td>{getStatusBadge(t.status)}</td>
                          {userRole === 'admin' && <td>{t.assignedTo || '-'}</td>}
                          <td>{t.ticketType || '-'}</td>
                          <td>{t.projectName || '-'}</td>
                          <td>{t.subject || '-'}</td>
                          <td>{t.expectedHours ?? '-'}</td>
                          <td>{lastReq.hours ?? '-'}</td>
                          <td>{daysWorked || '-'}</td>
                          <td>{lastReq.reason ?? '-'}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </Table>
              {renderPagination()}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

const InfoCard = ({ title, value, variant, icon }) => (
  <motion.div
    className={`bg-white rounded shadow-sm p-3 border-start border-5 border-${variant}`}
    whileHover={{ scale: 1.03 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="d-flex justify-content-between align-items-center">
      <div>
        <h6 className="text-muted mb-1">{title}</h6>
        <h3 className={`text-${variant} mb-0`}>{value}</h3>
      </div>
      {icon && <div className={`text-${variant}`}>{icon}</div>}
    </div>
  </motion.div>
);

const ChartCard = ({ title, data }) => (
  <motion.div 
    className="bg-white p-3 rounded shadow-sm h-100"
    whileHover={{ scale: 1.01 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <h6 className="text-center mb-3">{title}</h6>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
  </motion.div>
);

export default Dashboard;