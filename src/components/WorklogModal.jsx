import React, { useState, useEffect } from 'react';
import {
  Button, Modal, Form, Container, Row, Col, Table, Badge, Spinner, Dropdown
} from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import * as XLSX from 'xlsx';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';
import ReportsPage from './ReportsPage';

const WorklogReport = () => {
  // Online employees configuration
  const ONLINE_EMPLOYEES = [
    {
      name: "Hima",
      role: "employee",
      mode: "online",
      gmail: "himappradeep@jecc.ac.in"
    },
    {
      name: "Pravitha",
      role: "employee",
      mode: "online",
      gmail: "pravithacp@jecc.ac.in"
    }
  ];
  
  const DAILY_TARGET_HOURS = 6;
  const MAX_DAILY_HOURS = 6;
  
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ date: null });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [summaryData, setSummaryData] = useState([]);
  const [selectedDevelopers, setSelectedDevelopers] = useState([]);
  const [allDevelopers, setAllDevelopers] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (show) {
      fetchTickets();
    }
  }, [show]);

  // Helper function to format date without timezone issues
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get day type
  const getDayType = (date, holidays) => {
    const dateStr = formatDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidays.some(h => h.date === dateStr);
    
    if (isHoliday) return 'holiday';
    if (isWeekend) return 'weekend';
    return 'working';
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://anywhereworks-backend.onrender.com/tickets', {
        params: { status: ['Completed', 'Verified'] },
        validateStatus: (status) => status >= 200 && status < 500
      });

      let ticketsData = [];
      if (Array.isArray(response.data)) {
        ticketsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        ticketsData = response.data.data;
      } else if (response.data && Array.isArray(response.data.tickets)) {
        ticketsData = response.data.tickets;
      }

      const completedTickets = ticketsData.filter(ticket => 
        (ticket.status === 'Completed' || ticket.status === 'Verified') && 
        ticket.ticketNo && 
        ticket.projectName && 
        ticket.subject &&
        ticket.assignedTo
      );

      if (completedTickets.length === 0) {
        toast.info('No completed tickets available');
        setTickets([]);
        return;
      }

      const mappedTickets = completedTickets.map(ticket => {
        const isOnline = ONLINE_EMPLOYEES.some(emp => 
          emp.name.toLowerCase() === ticket.assignedTo.toLowerCase()
        );
        
        // Calculate actual hours based on assigned and completed dates
        let actualHours = 0;
        if (ticket.assignedDate && ticket.completedTime) {
          const assignedDate = new Date(ticket.assignedDate);
          const completedDate = new Date(ticket.completedTime);
          const diffTime = Math.abs(completedDate - assignedDate);
          actualHours = Math.min(Math.ceil(diffTime / (1000 * 60 * 60)), 
                                isOnline ? MAX_DAILY_HOURS : DAILY_TARGET_HOURS);
        } else {
          actualHours = isOnline ? MAX_DAILY_HOURS : DAILY_TARGET_HOURS;
        }

        return {
          id: ticket.ticketNo,
          project: ticket.projectName,
          title: ticket.subject,
          actualHours: actualHours,
          assignedTo: ticket.assignedTo,
          status: ticket.status,
          assignedDate: ticket.assignedDate ? new Date(ticket.assignedDate) : null,
          completedTime: ticket.completedTime ? new Date(ticket.completedTime) : null,
          isOnline
        };
      });

      setTickets(mappedTickets);
      
      // Extract unique developers and set them as options
      const developers = [...new Set(mappedTickets.map(ticket => ticket.assignedTo))];
      setAllDevelopers(developers);
      setSelectedDevelopers(developers); // Select all by default
      
      toast.success(`Loaded ${mappedTickets.length} completed tickets`, {
        autoClose: 2000
      });
    } catch (error) {
      if (error.response?.status === 404) {
        toast.warning('No completed tickets found');
      } else if (error.response?.status === 401) {
        toast.error('Authentication required');
      } else {
        toast.error('Failed to fetch tickets. Please try again.');
        console.error('Ticket fetch error:', error);
      }
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    setStartDate(null);
    setEndDate(null);
    setHolidays([]);
    setSummaryData([]);
    setSelectedDevelopers(allDevelopers);
  };

  const toggleDeveloperSelection = (developer) => {
    setSelectedDevelopers(prev => {
      if (prev.includes(developer)) {
        return prev.filter(dev => dev !== developer);
      } else {
        return [...prev, developer];
      }
    });
  };

  const selectAllDevelopers = () => {
    setSelectedDevelopers([...allDevelopers]);
  };

  const deselectAllDevelopers = () => {
    setSelectedDevelopers([]);
  };

  const addHoliday = () => {
    if (holidayForm.date) {
      const date = new Date(holidayForm.date);
      date.setHours(0, 0, 0, 0);
      
      const dateStr = formatDate(date);
      
      if (!holidays.some(h => h.date === dateStr)) {
        setHolidays(prev => [...prev, { date: dateStr }]);
        toast.success('Holiday added');
      } else {
        toast.warning('Holiday already exists');
      }
      setHolidayForm({ date: null });
    }
  };

  const removeHoliday = (date) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
    toast.info('Holiday removed');
  };

  const getWorkingDays = (start, end, excludedHolidays) => {
    const result = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    
    while (current <= endDate) {
      const dateStr = formatDate(current);
      const dayType = getDayType(current, excludedHolidays);
      
      // Only count working days
      if (dayType === 'working') {
        result.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  const generateReport = () => {
    if (!startDate || !endDate) {
      toast.error("Please select a valid date range");
      return;
    }

    if (tickets.length === 0) {
      toast.error("No completed tickets available");
      return;
    }

    if (selectedDevelopers.length === 0) {
      toast.error("Please select at least one developer");
      return;
    }

    setLoading(true);
    
    try {
      const workingDays = getWorkingDays(startDate, endDate, holidays);
      const summary = {};

      // Initialize summary for each selected developer
      selectedDevelopers.forEach(dev => {
        summary[dev] = {
          totalHours: 0,
          daysWorked: new Set(),
          ticketsCompleted: new Set(),
          isOnline: false,
          dailyHours: {},
          ticketDetails: {}
        };
      });

      // Process each ticket and assign to the completion date
      tickets.forEach(ticket => {
        if (!ticket.completedTime || !selectedDevelopers.includes(ticket.assignedTo)) return;

        const completedDate = new Date(ticket.completedTime);
        completedDate.setHours(0, 0, 0, 0);
        const completedDateStr = formatDate(completedDate);
        
        // Check if the completion date is within our working days
        if (workingDays.includes(completedDateStr)) {
          const devSummary = summary[ticket.assignedTo];
          
          // Update developer's online status
          devSummary.isOnline = ticket.isOnline;
          
          // Update total hours
          devSummary.totalHours += ticket.actualHours;
          
          // Add working day
          devSummary.daysWorked.add(completedDateStr);
          
          // Add completed ticket
          devSummary.ticketsCompleted.add(ticket.id);
          
          // Update daily hours
          if (!devSummary.dailyHours[completedDateStr]) {
            devSummary.dailyHours[completedDateStr] = 0;
          }
          devSummary.dailyHours[completedDateStr] += ticket.actualHours;
          
          // Store ticket details for this day
          if (!devSummary.ticketDetails[completedDateStr]) {
            devSummary.ticketDetails[completedDateStr] = [];
          }
          devSummary.ticketDetails[completedDateStr].push({
            ticketNo: ticket.id,
            project: ticket.project,
            title: ticket.title,
            hours: ticket.actualHours
          });
        }
      });

      // Convert summary to array format
      const summaryArray = Object.entries(summary).map(([developer, data]) => {
        const daysWorked = data.daysWorked.size;
        const monthlyTargetHours = workingDays.length * DAILY_TARGET_HOURS;
        const efficiency = (data.totalHours / monthlyTargetHours) * 100;
        const avgHoursPerDay = daysWorked > 0 ? (data.totalHours / daysWorked).toFixed(1) : '0.0';
        
        // Prepare daily breakdown with ALL dates in the range
        const dailyBreakdown = [];
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(0, 0, 0, 0);
        
        while (current <= endDateObj) {
          const dateStr = formatDate(current);
          const dayType = getDayType(current, holidays);
          
          // Add entry for every date in the range
          if (data.dailyHours[dateStr]) {
            // Date with work data
            dailyBreakdown.push({
              date: dateStr,
              hours: data.dailyHours[dateStr],
              achieved: data.dailyHours[dateStr] >= DAILY_TARGET_HOURS ? 'Yes' : 'No',
              tickets: data.ticketDetails[dateStr] || [],
              dayType: dayType
            });
          } else {
            // Date without work data
            dailyBreakdown.push({
              date: dateStr,
              hours: 0,
              achieved: 'No',
              tickets: [],
              dayType: dayType
            });
          }
          
          current.setDate(current.getDate() + 1);
        }
        
        return {
          developer,
          ticketsCompleted: data.ticketsCompleted.size,
          daysWorked,
          totalHours: data.totalHours,
          avgHoursPerDay,
          monthlyTarget: monthlyTargetHours,
          efficiency: efficiency.toFixed(1) + '%',
          isOnline: data.isOnline,
          dailyBreakdown
        };
      });
      
      setSummaryData(summaryArray);
      toast.success('Completed worklog report generated!');
    } catch (error) {
      toast.error('Error generating report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (summaryData.length === 0) {
      toast.warning('No data to export');
      return;
    }

    try {
      // Prepare summary data
      const summaryExportData = summaryData.map(summary => ({
        'Developer': summary.developer,
        'Status': summary.isOnline ? 'Online' : 'Offline',
        'Completed Tickets': summary.ticketsCompleted,
        'Days Worked': summary.daysWorked,
        'Total Hours': summary.totalHours,
        'Monthly Target': summary.monthlyTarget,
        'Avg Hours/Day': summary.avgHoursPerDay,
        'Efficiency': summary.efficiency
      }));

      // Prepare daily breakdown data with ticket details
      const dailyBreakdown = [];
      summaryData.forEach(summary => {
        summary.dailyBreakdown.forEach(day => {
          dailyBreakdown.push({
            'Developer': summary.developer,
            'Date': day.date,
            'Hours Worked': day.hours,
            'Daily Target': DAILY_TARGET_HOURS,
            'Status': day.achieved,
            'Day Type': day.dayType,
            'Tickets Completed': day.tickets.length
          });
        });
      });

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Add summary sheet
      const summaryWS = XLSX.utils.json_to_sheet(summaryExportData);
      XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");
      
      // Add daily breakdown sheet
      const dailyWS = XLSX.utils.json_to_sheet(dailyBreakdown);
      XLSX.utils.book_append_sheet(wb, dailyWS, "Daily Breakdown");

      // Generate file name with date range
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      const fileName = `Worklog_Report_${start}_to_${end}.xlsx`;

      // Export the workbook
      XLSX.writeFile(wb, fileName);
      toast.success('Report exported to Excel');
    } catch (error) {
      toast.error('Error exporting to Excel');
      console.error(error);
    }
  };

  const uploadToDatabase = async () => {
    if (summaryData.length === 0) {
      toast.warning('No data to upload');
      return;
    }

    setUploading(true);
    try {
      // Prepare only daily breakdown data for upload
      const dailyBreakdownData = [];
      
      summaryData.forEach(summary => {
        summary.dailyBreakdown.forEach(day => {
          dailyBreakdownData.push({
            developer: summary.developer,
            date: day.date,
            hoursWorked: day.hours,
            dailyTarget: DAILY_TARGET_HOURS,
            status: day.achieved,
            isOnline: summary.isOnline,
            tickets: day.tickets,
            dayType: day.dayType, // Added dayType to the upload data
            reportPeriod: {
              startDate: formatDate(startDate),
              endDate: formatDate(endDate)
            },
            hide: 'unblock', // Default value as string
            devstatus: 'notcomplete' // Default value
          });
        });
      });

      // Send data to server
      const response = await axios.post('https://anywhereworks-backend.onrender.com/daily-worklogs', {
        dailyBreakdowns: dailyBreakdownData,
        generatedAt: new Date().toISOString()
      });
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Daily worklog data uploaded to database successfully!');
      } else {
        toast.warning('Upload completed but with unexpected response');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload data to database');
    } finally {
      setUploading(false);
    }
  };

  // Function to check if a date is a holiday
  const isHoliday = (date) => {
    const dateStr = formatDate(date);
    return holidays.some(h => h.date === dateStr);
  };

  // Function to highlight holidays in the calendar
  const dayClassName = (date) => {
    if (isHoliday(date)) {
      return "holiday-date";
    }
    return null;
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="text-center mb-4">
        <Button onClick={handleShow} variant="primary" size="lg">
          Generate Completed Worklog Report
        </Button>
         <div>
                <ReportsPage/>
              </div>
      </div>

      <Modal show={show} onHide={handleClose} size="xl" centered scrollable>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Completed Worklog Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container fluid>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>From Date</Form.Label>
                  <DatePicker
                    selected={startDate}
                    onChange={date => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    maxDate={endDate}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select start date"
                    isClearable
                    dayClassName={dayClassName}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>To Date</Form.Label>
                  <DatePicker
                    selected={endDate}
                    onChange={date => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select end date"
                    isClearable
                    dayClassName={dayClassName}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Holidays</Form.Label>
                  <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {holidays.length === 0 ? (
                      <div className="text-muted text-center">No holidays added</div>
                    ) : (
                      holidays.map((holiday, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                          <span>
                            <Badge bg="secondary" className="me-2">{index + 1}</Badge>
                            {holiday.date}
                            {new Date(holiday.date).getDay() === 0 || new Date(holiday.date).getDay() === 6 ? (
                              <Badge bg="warning" className="ms-2">Weekend</Badge>
                            ) : (
                              <Badge bg="info" className="ms-2">Weekday</Badge>
                            )}
                          </span>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => removeHoliday(holiday.date)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Form.Group>

                <Form.Group>
                  <Form.Label>Add Holiday</Form.Label>
                  <div className="d-flex gap-2 align-items-start">
                    <DatePicker
                      selected={holidayForm.date}
                      onChange={date => setHolidayForm({...holidayForm, date})}
                      className="form-control"
                      placeholderText="Select holiday date"
                      minDate={startDate}
                      maxDate={endDate}
                      dateFormat="yyyy-MM-dd"
                      dayClassName={dayClassName}
                    />
                    <Button 
                      variant="primary" 
                      onClick={addHoliday}
                      disabled={!holidayForm.date}
                      style={{ minWidth: '80px' }}
                    >
                      Add
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>

            {/* Developer Selection Section */}
            {allDevelopers.length > 0 && (
              <Row className="mb-4">
                <Col>
                  <Form.Group>
                    <Form.Label>Select Developers</Form.Label>
                    <div className="d-flex gap-2 mb-2">
                      <Button variant="outline-primary" size="sm" onClick={selectAllDevelopers}>
                        Select All
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={deselectAllDevelopers}>
                        Deselect All
                      </Button>
                    </div>
                    <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {allDevelopers.map(developer => (
                        <Form.Check
                          key={developer}
                          type="checkbox"
                          id={`dev-${developer}`}
                          label={developer}
                          checked={selectedDevelopers.includes(developer)}
                          onChange={() => toggleDeveloperSelection(developer)}
                          className="mb-2"
                        />
                      ))}
                    </div>
                    <Form.Text className="text-muted">
                      {selectedDevelopers.length} of {allDevelopers.length} developers selected
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            )}

            <div className="text-center mb-4">
              <Button 
                onClick={generateReport} 
                disabled={loading || !startDate || !endDate || tickets.length === 0 || selectedDevelopers.length === 0}
                size="lg"
                className="me-2"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Generating Report...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>    
             
              
              {summaryData.length > 0 && (
                <>
                  <Dropdown className="d-inline-block me-2">
                    <Dropdown.Toggle variant="success" size="lg">
                      Export Data
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={exportToExcel}>Export to Excel</Dropdown.Item>
                      <Dropdown.Item onClick={() => window.print()}>Print Report</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                  
                  <Button 
                    variant="info" 
                    size="lg"
                    onClick={uploadToDatabase}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Uploading...
                      </>
                    ) : (
                      'Upload to Database'
                    )}
                  </Button>
                </>
              )}
            </div>

            {summaryData.length > 0 && (
              <>
                <div className="mb-4 p-3 bg-light rounded">
                  <h4 className="mb-3">Summary Report</h4>
                  <Table striped bordered hover responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>Developer</th>
                        <th>Status</th>
                        <th>Completed Tickets</th>
                        <th>Days Worked</th>
                        <th>Total Hours</th>
                        <th>Monthly Target</th>
                        <th>Avg Hours/Day</th>
                        <th>Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((summary, index) => (
                        <tr key={index}>
                          <td>{summary.developer}</td>
                          <td>
                            <Badge bg={summary.isOnline ? 'success' : 'secondary'}>
                              {summary.isOnline ? 'Online' : 'Offline'}
                            </Badge>
                          </td>
                          <td>{summary.ticketsCompleted}</td>
                          <td>{summary.daysWorked}</td>
                          <td>{summary.totalHours}</td>
                          <td>{summary.monthlyTarget}</td>
                          <td>{summary.avgHoursPerDay}</td>
                          <td>
                            <Badge bg={parseFloat(summary.efficiency) >= 100 ? 'success' : 
                                      parseFloat(summary.efficiency) >= 80 ? 'warning' : 'danger'}>
                              {summary.efficiency}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div className="mb-4">
                  <h4 className="mb-3">Daily Work Hours Breakdown</h4>
                  {summaryData.map((summary, index) => (
                    <div key={index} className="mb-4">
                      <h5>
                        {summary.developer} 
                        <Badge bg={summary.isOnline ? 'success' : 'secondary'} className="ms-2">
                          {summary.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </h5>
                      <Table striped bordered hover responsive size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Day Type</th>
                            <th>Hours Worked</th>
                            <th>Daily Target ({DAILY_TARGET_HOURS}h)</th>
                            <th>Status</th>
                            <th>Tickets Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.dailyBreakdown.map((day, dayIndex) => (
                            <tr key={dayIndex} className={day.dayType === 'holiday' ? "table-warning" : day.dayType === 'weekend' ? "table-secondary" : ""}>
                              <td>{day.date}</td>
                              <td>
                                {day.dayType === 'holiday' ? (
                                  <Badge bg="warning">Holiday</Badge>
                                ) : day.dayType === 'weekend' ? (
                                  <Badge bg="secondary">Weekend</Badge>
                                ) : (
                                  <Badge bg="info">Working Day</Badge>
                                )}
                              </td>
                              <td>{day.hours}</td>
                              <td>{DAILY_TARGET_HOURS}</td>
                              <td>
                                <Badge bg={day.hours >= DAILY_TARGET_HOURS ? 'success' : 'danger'}>
                                  {day.achieved}
                                </Badge>
                              </td>
                              <td>
                                {day.tickets.map((ticket, ticketIndex) => (
                                  <div key={ticketIndex} className="small">
                                    <strong>{ticket.ticketNo}</strong> | {ticket.project} : {ticket.title} ({ticket.hours}h)
                                  </div>
                                ))}
                                {day.tickets.length === 0 && (
                                  <span className="text-muted">No tickets completed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
          {summaryData.length > 0 && (
            <>
              <Button variant="primary" onClick={exportToExcel}>
                Export to Excel
              </Button>
              <Button 
                variant="info" 
                onClick={uploadToDatabase}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Uploading...
                  </>
                ) : (
                  'Upload to Database'
                )}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      <style>
        {`
          .holiday-date {
            background-color: #ffcccc !important;
            color: #ff0000 !important;
            font-weight: bold;
            border-radius: 50%;
          }
          .react-datepicker__day--outside-month {
            color: #ccc !important;
          }
          .react-datepicker__day--weekend {
            color: #ff0000;
          }
          .react-datepicker__header {
            background-color: #f8f9fa;
            border-bottom: 1px solid #ddd;
          }
          .react-datepicker__current-month {
            color: #495057;
            font-weight: 600;
          }
          .react-datepicker__day-name {
            color: #495057;
            font-weight: 600;
          }
          .table-warning {
            background-color: #fff3cd !important;
          }
          .table-secondary {
            background-color: #f8f9fa !important;
          }
        `}
      </style>
    </>
  );
};

export default WorklogReport;