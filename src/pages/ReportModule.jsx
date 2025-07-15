import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Table, Tab, Tabs, Form, Spinner, ButtonGroup, Button
} from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import 'jspdf-autotable';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const ReportModule = () => {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState({ excel: false, pdf: false, csv: false });
  const [tab, setTab] = useState('developer');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [developer, setDeveloper] = useState('');
  const [project, setProject] = useState('');
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState(null);

// const developers = [
//   { name: 'Jeswin', gmail: 'jeswinjohn03@gmail.com' },
//   { name: 'Anu Mathew', gmail: 'anu@example.com' },
//   { name: 'Arun K', gmail: 'arun@example.com' },
//   { name: 'Neha Joseph', gmail: 'neha@example.com' }
// ];
const developers = [
  { name: 'Merin', gmail: 'merinjdominic@jecc.ac.in' },
  { name: 'Sandra', gmail: 'sandraps@jecc.ac.in' },
  { name: 'Deepthi', gmail: 'deepthimohan@jecc.ac.in' },
  { name: 'Abin', gmail: 'abinjose@jecc.ac.in' },
  { name: 'Jeswin', gmail: 'jeswinjohn@jecc.ac.in' },
  { name: 'Pravitha', gmail: 'pravithacp@jecc.ac.in' },
  { name: 'Hima', gmail: 'himappradeep@jecc.ac.in' }
];

  const projects = ['CRM', 'Catechism', 'Website'];

  const reportHeaders = [
    '#', 'Ticket No', 'Subject', 'Project', 'Status',
    'Assigned To', 'Expected Hours', 'Requested Hours', 'Assigned Date'
  ];

  useEffect(() => {
    setReportData([]);
    setDeveloper('');
    setProject('');
    setError(null);
  }, [tab]);

  const fetchReport = async () => {
    setError(null);

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      setError('End date must be after or equal to start date');
      return;
    }

    setLoading(true);
    try {
      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...(tab === 'developer' && developer && { assignedTo: developer }),
        ...(tab === 'project' && project && { projectName: project }),
      };

      const res = await axios.get('http://localhost:4000/getalldataa', { params });

      if (!Array.isArray(res.data?.data)) {
        throw new Error(res.data?.message || 'Invalid response format');
      }

   const filtered = res.data.data.filter((item) => {
  if (!item.assignedDate) return false;

  const assigned = new Date(item.assignedDate);
  const matchDate = !isNaN(assigned.getTime()) && assigned >= start && assigned <= end;

  const matchDeveloper = tab === 'developer' && developer
    ? item.assignedTo === developers.find(d => d.name === developer)?.gmail
    : true;

  const matchProject = tab === 'project' && project
    ? item.projectName === project
    : true;

  return matchDate && matchDeveloper && matchProject;
});


      const processed = filtered.map((item, i) => ({
        ...item,
        id: i + 1,
        assignedDate: item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : 'N/A',
        requestedHours: item.timeRequests?.at(-1)?.hours || 'N/A',
        expectedHours: item.expectedHours ?? 'N/A',
      }));

      setReportData(processed);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed': return 'success';
      case 'in progress': return 'warning';
      case 'pending': return 'info';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getReportTitle = () => {
    let entity = 'All';
    if (tab === 'developer') {
      entity = developer || 'All Developers';
    } else {
      entity = project || 'All Projects';
    }
    return `${tab === 'developer' ? 'Developer' : 'Project'} Report: ${entity} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
  };

  const getFileNameBase = () => {
    const selected = tab === 'developer' ? (developer || 'all') : (project || 'all');
    return `${tab}_report_${selected}_${new Date().toISOString().slice(0, 10)}`;
  };

  const exportToExcel = () => {
    setExportLoading(prev => ({ ...prev, excel: true }));
    try {
      const fileName = getFileNameBase() + '.xlsx';
      const wsData = [
        [getReportTitle()],
        [`Generated on: ${new Date().toLocaleString()}`],
        [],
        reportHeaders,
        ...reportData.map(item => [
          item.id, item.ticketNo || 'N/A', item.subject || 'N/A', item.projectName || 'N/A',
          item.status || 'N/A', item.assignedTo || 'N/A', item.expectedHours, item.requestedHours, item.assignedDate
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Excel export error:', error);
      setError('Failed to export Excel file');
    } finally {
      setExportLoading(prev => ({ ...prev, excel: false }));
    }
  };

const exportToPDF = () => {
  setExportLoading(prev => ({ ...prev, pdf: true }));

  try {
    const fileName = getFileNameBase() + '.pdf';
    const title = getReportTitle();

    const tableBody = [
      reportHeaders, // header row
      ...reportData.map(item => [
        item.id,
        item.ticketNo || 'N/A',
        item.subject || 'N/A',
        item.projectName || 'N/A',
        item.status || 'N/A',
        item.assignedTo || 'N/A',
        item.expectedHours,
        item.requestedHours,
        item.assignedDate
      ])
    ];

    const docDefinition = {
      content: [
        { text: title, style: 'header', alignment: 'center' },
        { text: `Generated on: ${new Date().toLocaleString()}`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', '*', '*', 'auto', 'auto', 'auto'],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: { fontSize: 16, bold: true },
        subheader: { fontSize: 10, color: 'gray' }
      },
      defaultStyle: {
        fontSize: 9
      },
      pageOrientation: 'landscape'
    };

    pdfMake.createPdf(docDefinition).download(fileName);
  } catch (error) {
    console.error('PDF export error:', error);
    setError('Failed to export PDF file');
  } finally {
    setExportLoading(prev => ({ ...prev, pdf: false }));
  }
};



  const exportToCSV = () => {
    setExportLoading(prev => ({ ...prev, csv: true }));
    try {
      const title = getReportTitle();
      const fileName = getFileNameBase() + '.csv';
      const csvRows = [
        title,
        `Generated on: ${new Date().toLocaleString()}`,
        '',
        reportHeaders.join(','),
        ...reportData.map(item =>
          [
            item.id, item.ticketNo || 'N/A', item.subject || 'N/A', item.projectName || 'N/A',
            item.status || 'N/A', item.assignedTo || 'N/A', item.expectedHours, item.requestedHours, item.assignedDate
          ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
        )
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export error:', error);
      setError('Failed to export CSV file');
    } finally {
      setExportLoading(prev => ({ ...prev, csv: false }));
    }
  };

  const renderTable = () => {
    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" /> Loading...</div>;
    if (error) return <div className="text-center text-danger py-4">{error}</div>;
    if (!reportData.length) return <div className="text-center text-muted py-4">No data found.</div>;

    return (
      <>
        <div className="d-flex justify-content-end mb-3">
          <ButtonGroup>
            <Button variant="outline-success" onClick={exportToExcel} disabled={exportLoading.excel}>
              {exportLoading.excel ? <><Spinner animation="border" size="sm" /> Exporting...</> : 'Export Excel'}
            </Button>
            <Button variant="outline-danger" onClick={exportToPDF} disabled={exportLoading.pdf}>
              {exportLoading.pdf ? <><Spinner animation="border" size="sm" /> Exporting...</> : 'Export PDF'}
            </Button>
            <Button variant="outline-primary" onClick={exportToCSV} disabled={exportLoading.csv}>
              {exportLoading.csv ? <><Spinner animation="border" size="sm" /> Exporting...</> : 'Export CSV'}
            </Button>
          </ButtonGroup>
        </div>
        <div className="table-responsive">
          <Table striped bordered hover className="align-middle text-center">
            <thead className="table-dark">
              <tr>{reportHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {reportData.map((item) => (
                <motion.tr key={item._id || item.ticketNo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td>{item.id}</td>
                  <td>{item.ticketNo || 'N/A'}</td>
                  <td>{item.subject || 'N/A'}</td>
                  <td>{item.projectName || 'N/A'}</td>
                  <td><span className={`badge bg-${getStatusBadgeColor(item.status)}`}>{item.status || 'N/A'}</span></td>
                  <td>{item.assignedTo || 'N/A'}</td>
                  <td>{item.expectedHours}</td>
                  <td>{item.requestedHours}</td>
                  <td>{item.assignedDate}</td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <Container fluid className="py-4">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="shadow-sm rounded-4">
                <Card.Body>
                  <h4 className="text-center fw-bold mb-4">Reporting Module</h4>
                  <Tabs activeKey={tab} onSelect={(k) => setTab(k)} className="mb-4 justify-content-center">
                    <Tab eventKey="developer" title="Developer Report" />
                    <Tab eventKey="project" title="Project Report" />
                  </Tabs>

                  <Form className="mb-4">
                    <Row className="mb-3 justify-content-center align-items-end">
                      <Col md={3}>
                        <Form.Label>Start Date</Form.Label>
                        <DatePicker selected={startDate} onChange={setStartDate} maxDate={endDate} className="form-control" dateFormat="dd/MM/yyyy" />
                      </Col>
                      <Col md={3}>
                        <Form.Label>End Date</Form.Label>
                        <DatePicker selected={endDate} onChange={setEndDate} minDate={startDate} className="form-control" dateFormat="dd/MM/yyyy" />
                      </Col>

                      {tab === 'developer' && (
                        <Col md={3}>
                          <Form.Label>Developer</Form.Label>
                          <Form.Select value={developer} onChange={(e) => setDeveloper(e.target.value)}>
                            <option value="">All Developers</option>
                            {developers.map((d) => (
                              <option key={d.email} value={d.name}>{d.name}</option>
                            ))}
                          </Form.Select>
                        </Col>
                      )}

                      {tab === 'project' && (
                        <Col md={3}>
                          <Form.Label>Project</Form.Label>
                          <Form.Select value={project} onChange={(e) => setProject(e.target.value)}>
                            <option value="">All Projects</option>
                            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
                          </Form.Select>
                        </Col>
                      )}

                      <Col md="auto">
                        <Button onClick={fetchReport} className="fw-bold px-4">
                          {loading ? <><Spinner as="span" animation="border" size="sm" /> Generating...</> : 'Generate Report'}
                        </Button>
                      </Col>
                    </Row>
                  </Form>

                  {renderTable()}
                </Card.Body>
              </Card>
            </motion.div>
          </Container>
        </main>
      </div>
    </div>
  );
};

export default ReportModule;
