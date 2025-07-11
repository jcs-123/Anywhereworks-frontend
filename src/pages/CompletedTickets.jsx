import React, { useEffect, useState } from 'react';
import {
  Container,
  Button,
  ButtonGroup,
  Spinner,
  Badge,
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

const CompletedTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredTickets, setFilteredTickets] = useState([]);

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('https://anywhereworks-backend.onrender.com/completed');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
          setTickets(processedTickets);
          setFilteredTickets(processedTickets);
        } else {
          toast.error(json.message || 'Failed to fetch tickets');
        }
      } catch (error) {
        console.error('Error fetching completed tickets:', error);
        toast.error(error.message || 'Server Error');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleVerify = async (ticketId) => {
    try {
      const res = await fetch(`https://anywhereworks-backend.onrender.com/tickets/${ticketId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();

      if (result.success) {
        setFilteredTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: 'Verified' } : t));
        setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: 'Verified' } : t));
        const verifiedTicket = tickets.find(t => t._id === ticketId);
        toast.success(`Ticket ${verifiedTicket?.ticketNo || ticketId} verified successfully`);
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(err.message || 'Server error during verification');
    }
  };

  const exportToExcel = () => {
    try {
      const data = filteredTickets.map((item, idx) => ({
        'S.No': idx + 1,
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
    } catch (error) {
      console.error('Export to Excel error:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Completed Ticket Report', 105, 15, { align: 'center' });
      autoTable(doc, {
        head: [['#', 'Project', 'Ticket ID', 'Completed Time', 'Subject', 'Exp. Hrs', 'Req. Hrs', 'Reason', 'Status']],
        body: filteredTickets.map((item, idx) => [
          idx + 1,
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
        headStyles: { fillColor: [41, 128, 185] },
      });
      doc.save('completed_tickets.pdf');
    } catch (error) {
      console.error('Export to PDF error:', error);
      toast.error('Failed to export to PDF');
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchText(value);
    const filtered = tickets.filter((t) =>
      t.projectName?.toLowerCase().includes(value) ||
      t.subject?.toLowerCase().includes(value) ||
      t.reason?.toLowerCase().includes(value) ||
      t.ticketNo?.toString().includes(value) ||
      t.status?.toLowerCase().includes(value)
    );
    setFilteredTickets(filtered);
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
      selector: row => row.approvedTimeRequests?.map((req, i) =>
        `${i + 1}. ${req.reason} (${req.hours} hrs)`
      ).join('\n') || 'N/A',
      wrap: true,
      grow: 2
    },
    {
      name: 'Status',
      cell: (row) =>
        row.status === 'Verified' ? (
          <Badge bg="success" pill>Verified</Badge>
        ) : (
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => handleVerify(row._id)}
          >
            Verify
          </Button>
        ),
      center: true,
    }
  ];

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="d-flex flex-grow-1 print-hide">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <Container fluid>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.6 }}
            >
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <h1 className="h4 fw-bold m-0">Completed Tickets</h1>
            <motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ type: 'spring', duration: 0.5 }}
  className="d-flex flex-column flex-md-row gap-2"
>
  <Button variant="outline-success" size="sm" onClick={exportToPDF}>
    Export PDF
  </Button>
  <Button variant="outline-primary" size="sm" onClick={exportToExcel}>
    Export Excel
  </Button>
</motion.div>

              </div>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" role="status" />
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
                  subHeader
                  subHeaderComponent={
                    <div className="w-100 d-flex justify-content-end mb-3">
                      <input
                        type="text"
                        placeholder="Search tickets..."
                        className="form-control form-control-sm"
                        style={{ maxWidth: '300px' }}
                        value={searchText}
                        onChange={handleSearch}
                      />
                    </div>
                  }
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
