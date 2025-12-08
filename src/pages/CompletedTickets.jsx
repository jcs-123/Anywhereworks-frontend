import React, { useEffect, useState } from 'react';
import {
  Container,
  Button,
  Spinner,
  Badge,
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import { motion } from 'framer-motion';
import DataTable from 'react-data-table-component';
import { toast, ToastContainer } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const assigneeOptions = [
  { name: 'Merin', gmail: 'merinjdominic@jecc.ac.in' },
  { name: 'Sandra', gmail: 'sandraps@jecc.ac.in' },
  { name: 'Deepthi', gmail: 'deepthimohan@jecc.ac.in' },
  { name: 'Jeswin', gmail: 'jeswinjohn@jecc.ac.in' },
  { name: 'Pravitha', gmail: 'pravithacp@jecc.ac.in' },
  { name: 'Hima', gmail: 'himappradeep@jecc.ac.in' },
      { name: 'anjiya', gmail: 'anjiyapj@gmail.com' },

];

const CompletedTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeStatus = (dateString) => {
    if (!dateString) return 'unknown';
    const now = new Date();
    const ticketDate = new Date(dateString);
    const diffHours = (now - ticketDate) / (1000 * 60 * 60);
    if (diffHours < 24) return 'recent';
    if (diffHours < 72) return 'moderate';
    return 'old';
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://anywhereworks-backend.onrender.com/completed');
      const json = await res.json();

      if (json.success) {
        const processedTickets = json.data.map(ticket => ({
          ...ticket,
          formattedTime: formatTime(ticket.completedTime),
          timeStatus: getTimeStatus(ticket.completedTime),
          projectName: ticket.projectName || 'N/A',
          ticketNo: ticket.ticketNo || ticket.ticket_id || 'N/A',
          subject: ticket.subject || 'No subject',
          expectedHours: ticket.expectedHours || 0,
          hours: ticket.hours || ticket.requestedHours || 0,
          reason: ticket.reason || ticket.responseNote || 'No reason provided'
        }));

        const sorted = processedTickets.sort((a, b) =>
          a.status === 'Verified' ? 1 : -1
        );

        setTickets(sorted);
        setFilteredTickets(sorted);
      } else {
        toast.error(json.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      toast.error(error.message || 'Server Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let filtered = [...tickets];
    if (selectedAssignee) {
      filtered = filtered.filter(t => t.assignedTo === selectedAssignee);
    }

    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.projectName.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.reason.toLowerCase().includes(query) ||
        t.ticketNo.toString().includes(query) ||
        t.status.toLowerCase().includes(query)
      );
    }

    setFilteredTickets(filtered);
  }, [searchText, selectedAssignee, tickets]);

  const handleVerify = async (ticketId) => {
    try {
      const res = await fetch(`https://anywhereworks-backend.onrender.com/tickets/${ticketId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();
      if (result.success) {
        const updateStatus = (arr) =>
          arr.map(t => t._id === ticketId ? { ...t, status: 'Verified' } : t);

        setTickets(updateStatus);
        setFilteredTickets(updateStatus);
        toast.success(`Ticket ${ticketId} verified successfully`);
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (err) {
      toast.error(err.message || 'Verification error');
    }
  };

  const exportToExcel = () => {
    try {
      const data = filteredTickets.map((item, i) => ({
        'S.No': i + 1,
        'Project': item.projectName,
        'Ticket ID': item.ticketNo,
        'Completed Time': item.formattedTime,
        'Subject': item.subject,
        'Expected Hours': item.expectedHours,
        'Requested Hours': item.hours,
        'Reason': item.reason,
        'Status': item.status,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Completed Tickets');
      XLSX.writeFile(wb, 'completed_tickets.xlsx');
    } catch (err) {
      toast.error('Excel export failed');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Completed Ticket Report', 105, 15, { align: 'center' });
      autoTable(doc, {
        head: [['#', 'Project', 'Ticket ID', 'Completed Time', 'Subject', 'Exp. Hrs', 'Req. Hrs', 'Reason', 'Status']],
        body: filteredTickets.map((item, i) => [
          i + 1,
          item.projectName,
          item.ticketNo,
          item.formattedTime,
          item.subject,
          item.expectedHours,
          item.hours,
          item.reason,
          item.status,
        ]),
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] },
      });
      doc.save('completed_tickets.pdf');
    } catch (err) {
      toast.error('PDF export failed');
    }
  };

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px', sortable: true },
    { name: 'Project', selector: row => row.projectName, sortable: true },
    { name: 'Ticket ID', selector: row => row.ticketNo, sortable: true },
    { name: 'Completed Time', selector: row => row.formattedTime, sortable: true },
    { name: 'Subject', selector: row => row.subject, wrap: true, grow: 2 },
    { name: 'Expected Hours', selector: row => row.expectedHours },
    { name: 'Extra Hours', selector: row => row.approvedExtraHours || 0 },
    {
      name: 'Extension Reason',
      selector: row =>
        row.approvedTimeRequests?.map((r, i) =>
          `${i + 1}. ${r.reason} (${r.hours}h)`
        ).join('; ') || 'N/A',
      wrap: true,
      grow: 2,
    },
    {
      name: 'Status',
      cell: row =>
        row.status === 'Verified' ? (
          <Badge bg="success">Verified</Badge>
        ) : (
          <Button size="sm" variant="outline-success" onClick={() => handleVerify(row._id)}>
            Verify
          </Button>
        ),
      center: true,
    },
  ];

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-3 bg-light">
          <Container fluid>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <div className="mb-3">
                <h4 className="fw-bold">Completed Tickets</h4>
              </div>

              <Row className="g-2 mb-3">
                <Col xs={12} md="auto">
                  <Form.Select
                    size="sm"
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    aria-label="Filter by Assignee"
                  >
                    <option value="">All Developers</option>
                    {assigneeOptions.map((a) => (
                      <option key={a.gmail} value={a.gmail}>{a.name}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col xs={12} md="auto">
                  <Button variant="primary" size="sm" onClick={fetchTickets}>🔄 Refresh</Button>
                </Col>

                <Col xs={12} md="auto">
                  <Button variant="outline-success" size="sm" onClick={exportToPDF}>Export PDF</Button>
                </Col>

                <Col xs={12} md="auto">
                  <Button variant="outline-primary" size="sm" onClick={exportToExcel}>Export Excel</Button>
                </Col>

                <Col xs={12} md className="text-md-end">
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="form-control form-control-sm"
                    style={{ maxWidth: '300px' }}
                    aria-label="Search Tickets"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredTickets}
                  pagination
                  striped
                  highlightOnHover
                  responsive
                  persistTableHead
                  noDataComponent={<div className="py-4 text-center">No completed tickets found</div>}
                />
              )}
            </motion.div>
          </Container>
        </main>
      </div>
    </div>
  );
};

export default CompletedTickets;
