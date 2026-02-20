import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Table,
  Form,
  Pagination,
  Spinner,
  Alert,
  Badge,
  Button,
  Row,
  Col,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const API_BASE_URL = "https://anywhereworks-backend.onrender.com";
const ROWS_PER_PAGE = 20;
const PAGE_WINDOW = 5;

// Assignee options for filtering
const assigneeOptions = [
  { name: 'Merin', gmail: 'merinjdominic@jecc.ac.in' },
  { name: 'Sandra', gmail: 'sandraps@jecc.ac.in' },
  { name: 'Deepthi', gmail: 'deepthimohan@jecc.ac.in' },
  { name: 'Jeswin', gmail: 'jeswinjohn@jecc.ac.in' },
  { name: 'Pravitha', gmail: 'pravithacp@jecc.ac.in' },
  { name: 'Hima', gmail: 'himappradeep@jecc.ac.in' },
  { name: 'anjiya', gmail: 'anjiyapj@gmail.com' },
];

const EfinReport = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [parishList, setParishList] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedParish, setSelectedParish] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingParishes, setLoadingParishes] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortField, setSortField] = useState("ticketNo");
  const [sortDirection, setSortDirection] = useState("asc");

  // Fetch parishes on component mount
  useEffect(() => {
    fetchParishes();
  }, []);

  // Fetch tickets after parishes are loaded or on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Fetch parishes from API
  const fetchParishes = async () => {
    try {
      setLoadingParishes(true);
      const res = await axios.get(`${API_BASE_URL}/parish/`);
      // Sort parishes alphabetically
      const sortedParishes = res.data.sort((a, b) => 
        a.parishName?.localeCompare(b.parishName || '')
      );
      setParishList(sortedParishes);
    } catch (err) {
      console.error("Parish fetch error", err);
      toast.error("Failed to load parishes");
    } finally {
      setLoadingParishes(false);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/ticketrequest`);

      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.tickets)
        ? res.data.tickets
        : Array.isArray(res.data)
        ? res.data
        : [];

      // Filter ONLY Efin projects with completed/verified status
      const efinOnly = data
        .filter(
          (t) =>
            t.projectName?.toLowerCase() === "efin" &&
            ["completed", "verified"].includes(t.status?.toLowerCase())
        )
        .map(ticket => ({
          ...ticket,
          // Ensure description fields exist
          descriptionEfin1: ticket.descriptionEfin1 || "",
          descriptionEfin2: ticket.descriptionEfin2 || "",
          // Format completed time
          formattedCompletedTime: ticket.completedTime 
            ? new Date(ticket.completedTime).toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A',
          // Get assignee name from email
          assignedToName: ticket.assignedTo ? 
            assigneeOptions.find(a => a.gmail === ticket.assignedTo)?.name || ticket.assignedTo 
            : 'Unassigned',
          // Get parish name from ID
          parishName: ticket.parishId ? 
            parishList.find(p => p._id === ticket.parishId)?.parishName || 'Unknown Parish' 
            : 'No Parish',
        }))
        .sort((a, b) => (a.ticketNo || 0) - (b.ticketNo || 0));

      setTickets(efinOnly);
      setFilteredTickets(efinOnly);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load Efin tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    const direction = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(direction);

    const sorted = [...filteredTickets].sort((a, b) => {
      let aVal = a[field] || "";
      let bVal = b[field] || "";

      // Handle numeric values
      if (field === "ticketNo" || field === "expectedHours") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } 
      // Handle dates
      else if (field === "completedTime") {
        aVal = a.completedTime ? new Date(a.completedTime).getTime() : 0;
        bVal = b.completedTime ? new Date(b.completedTime).getTime() : 0;
      }
      // Handle strings
      else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTickets(sorted);
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) return "↕️";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Handle filters (search, assignee, parish, date)
  const handleFilters = (
    searchVal = search,
    assigneeVal = selectedAssignee,
    parishVal = selectedParish,
    sDate = startDate,
    eDate = endDate
  ) => {
    let filtered = [...tickets];

    // Search filter
    if (searchVal) {
      const query = searchVal.toLowerCase();
      filtered = filtered.filter((t) => {
        return (
          (t.ticketNo && t.ticketNo.toString().toLowerCase().includes(query)) ||
          (t.subject && t.subject.toLowerCase().includes(query)) ||
          (t.descriptionEfin1 && t.descriptionEfin1.toLowerCase().includes(query)) ||
          (t.descriptionEfin2 && t.descriptionEfin2.toLowerCase().includes(query)) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(query)) ||
          (t.parishName && t.parishName.toLowerCase().includes(query))
        );
      });
    }

    // Assignee filter
    if (assigneeVal) {
      filtered = filtered.filter((t) => t.assignedTo === assigneeVal);
    }

    // Parish filter
    if (parishVal) {
      filtered = filtered.filter((t) => t.parishId === parishVal);
    }

    // Date filter
    if (sDate || eDate) {
      filtered = filtered.filter((t) => {
        if (!t.completedTime) return false;
        const completed = new Date(t.completedTime);
        
        if (sDate) {
          const start = new Date(sDate);
          start.setHours(0, 0, 0, 0);
          if (completed < start) return false;
        }
        
        if (eDate) {
          const end = new Date(eDate);
          end.setHours(23, 59, 59, 999);
          if (completed > end) return false;
        }
        
        return true;
      });
    }

    // Apply current sort
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField] || "";
        let bVal = b[sortField] || "";

        if (sortField === "ticketNo" || sortField === "expectedHours") {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else if (sortField === "completedTime") {
          aVal = a.completedTime ? new Date(a.completedTime).getTime() : 0;
          bVal = b.completedTime ? new Date(b.completedTime).getTime() : 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    setFilteredTickets(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    handleFilters(value, selectedAssignee, selectedParish, startDate, endDate);
  };

  const handleAssigneeChange = (e) => {
    const value = e.target.value;
    setSelectedAssignee(value);
    handleFilters(search, value, selectedParish, startDate, endDate);
  };

  const handleParishChange = (e) => {
    const value = e.target.value;
    setSelectedParish(value);
    handleFilters(search, selectedAssignee, value, startDate, endDate);
  };

  const handleDateChange = (type, date) => {
    if (type === "start") {
      setStartDate(date);
      handleFilters(search, selectedAssignee, selectedParish, date, endDate);
    } else {
      setEndDate(date);
      handleFilters(search, selectedAssignee, selectedParish, startDate, date);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedAssignee("");
    setSelectedParish("");
    setStartDate(null);
    setEndDate(null);
    setFilteredTickets(tickets);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTickets.length / ROWS_PER_PAGE);
  const indexOfLastRow = currentPage * ROWS_PER_PAGE;
  const indexOfFirstRow = indexOfLastRow - ROWS_PER_PAGE;
  const currentRows = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

  // Page window for pagination
  const windowStart = Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);
  const pageNumbers = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  // Statistics
  const totalExpected = filteredTickets.reduce(
    (sum, t) => sum + (Number(t.expectedHours) || 0),
    0
  );

  const totalWithDesc1 = filteredTickets.filter((t) => t.descriptionEfin1).length;
  const totalWithDesc2 = filteredTickets.filter((t) => t.descriptionEfin2).length;
  const totalWithBothDesc = filteredTickets.filter(
    (t) => t.descriptionEfin1 && t.descriptionEfin2
  ).length;

  // Group by assignee for summary
  const ticketsByAssignee = filteredTickets.reduce((acc, ticket) => {
    const assignee = ticket.assignedToName || "Unassigned";
    if (!acc[assignee]) {
      acc[assignee] = {
        count: 0,
        hours: 0,
        withDesc1: 0,
        withDesc2: 0,
      };
    }
    acc[assignee].count++;
    acc[assignee].hours += Number(ticket.expectedHours) || 0;
    if (ticket.descriptionEfin1) acc[assignee].withDesc1++;
    if (ticket.descriptionEfin2) acc[assignee].withDesc2++;
    return acc;
  }, {});

  // Group by parish for summary
  const ticketsByParish = filteredTickets.reduce((acc, ticket) => {
    const parish = ticket.parishName || "Unknown Parish";
    if (!acc[parish]) {
      acc[parish] = {
        count: 0,
        hours: 0,
        withDesc1: 0,
        withDesc2: 0,
      };
    }
    acc[parish].count++;
    acc[parish].hours += Number(ticket.expectedHours) || 0;
    if (ticket.descriptionEfin1) acc[parish].withDesc1++;
    if (ticket.descriptionEfin2) acc[parish].withDesc2++;
    return acc;
  }, {});

  // Export to Excel with assignee and parish data
const exportToExcel = () => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Set workbook properties
  wb.Props = {
    Title: "EFIN Completed/Verified Tickets Report",
    Subject: "Tickets Analysis",
    Author: "Efin Management System",
    Company: "Efin",
    Category: "Reports",
    Keywords: "efin, tickets, completed, verified, analysis",
    Comments: `Generated on ${new Date().toLocaleString('en-IN')}`,
    CreatedDate: new Date()
  };

  // Helper function to apply cell styles
  const styleCell = (value, styles = {}) => {
    return {
      v: value,
      t: typeof value === 'number' ? 'n' : 's',
      s: styles
    };
  };

  // Get filter information
  const filterInfo = {
    assignee: selectedAssignee ? 
      assigneeOptions.find(a => a.gmail === selectedAssignee)?.name || selectedAssignee : 'All Assignees',
    parish: selectedParish ? 
      parishList.find(p => p._id === selectedParish)?.parishName || selectedParish : 'All Parishes',
    startDate: startDate ? startDate.toLocaleDateString('en-IN') : 'Any',
    endDate: endDate ? endDate.toLocaleDateString('en-IN') : 'Any'
  };

  // Main Data Sheet
  const mainSheetData = [
    // Main Title - Large and Bold
    [{ v: "EFIN COMPLETED / VERIFIED TICKETS REPORT", 
       s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, 
            fill: { fgColor: { rgb: "4472C4" } }, 
            alignment: { horizontal: "center", vertical: "center" } } }],
    
    // Generation Info
    [{ v: `Generated: ${new Date().toLocaleString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      })}`,
      s: { font: { italic: true, sz: 11, color: { rgb: "666666" } } } }],
    
    // Filter Information
    [{ v: `Filters: ${filterInfo.assignee} | ${filterInfo.parish} | Date: ${filterInfo.startDate} - ${filterInfo.endDate}`,
      s: { font: { sz: 10, color: { rgb: "333333" } }, 
           fill: { fgColor: { rgb: "F2F2F2" } } } }],
    
    // Empty row
    [],
    
    // Column Headers with styling
    [
      { v: "Ticket No", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                              fill: { fgColor: { rgb: "305496" } },
                              alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Status", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                          fill: { fgColor: { rgb: "305496" } },
                          alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Assignee", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                            fill: { fgColor: { rgb: "305496" } },
                            alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Parish", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                          fill: { fgColor: { rgb: "305496" } },
                          alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Subject", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                           fill: { fgColor: { rgb: "305496" } },
                           alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Description 1", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                                 fill: { fgColor: { rgb: "305496" } },
                                 alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Description 2", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                                 fill: { fgColor: { rgb: "305496" } },
                                 alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Expected Hours", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                                  fill: { fgColor: { rgb: "305496" } },
                                  alignment: { horizontal: "center", vertical: "center" } } },
      { v: "Completed Time", s: { font: { bold: true, color: { rgb: "FFFFFF" } }, 
                                  fill: { fgColor: { rgb: "305496" } },
                                  alignment: { horizontal: "center", vertical: "center" } } }
    ],
    
    // Data rows with alternating row colors
    ...filteredTickets.map((t, index) => {
      const rowColor = index % 2 === 0 ? "FFFFFF" : "F5F5F5";
      
      // Status color coding
      let statusStyle = {};
      if (t.status?.toLowerCase() === 'verified') {
        statusStyle = { font: { color: { rgb: "008000" }, bold: true } };
      } else if (t.status?.toLowerCase() === 'completed') {
        statusStyle = { font: { color: { rgb: "0000FF" }, bold: true } };
      }

      return [
        { v: t.ticketNo || "N/A", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "center" } } },
        { v: t.status || "N/A", 
          s: { fill: { fgColor: { rgb: rowColor } }, ...statusStyle, alignment: { horizontal: "center" } } },
        { v: t.assignedToName || "Unassigned", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "center" } } },
        { v: t.parishName || "No Parish", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "left" } } },
        { v: t.subject || "N/A", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "left" } } },
        { v: t.descriptionEfin1 || "", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "left" } } },
        { v: t.descriptionEfin2 || "", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "left" } } },
        { v: t.expectedHours || 0, 
          s: { fill: { fgColor: { rgb: rowColor } }, 
               numFmt: "0.00",
               alignment: { horizontal: "center" } } },
        { v: t.formattedCompletedTime || "N/A", 
          s: { fill: { fgColor: { rgb: rowColor } }, alignment: { horizontal: "center" } } }
      ];
    }),
    
    // Footer with summary
    [],
    [
      { v: "Total Tickets:", 
        s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: filteredTickets.length, 
        s: { font: { bold: true, color: { rgb: "4472C4" } }, 
             numFmt: "#,##0",
             alignment: { horizontal: "center" } } },
      { v: "Total Hours:", 
        s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: totalExpected, 
        s: { font: { bold: true, color: { rgb: "4472C4" } }, 
             numFmt: "0.00",
             alignment: { horizontal: "center" } } }
    ]
  ];

  // Create main sheet
  const mainSheet = XLSX.utils.aoa_to_sheet(mainSheetData);

  // Apply column widths for main sheet
  mainSheet['!cols'] = [
    { wch: 12 }, // Ticket No
    { wch: 10 }, // Status
    { wch: 15 }, // Assignee
    { wch: 25 }, // Parish
    { wch: 40 }, // Subject
    { wch: 30 }, // Description 1
    { wch: 30 }, // Description 2
    { wch: 15 }, // Expected Hours
    { wch: 20 }, // Completed Time
  ];

  // Merge title cells (A1:I1)
  mainSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title merge
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Generation info merge
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Filters merge
  ];

  // Add the sheet to workbook
  XLSX.utils.book_append_sheet(wb, mainSheet, "Efin Tickets");

  // Statistics Sheet
  const statsSheetData = [
    // Title
    [{ v: "EFIN TICKETS STATISTICS", 
       s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, 
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center" } } }],
    [],
    
    // Total Statistics with styling
    [{ v: "Total Tickets:", s: { font: { bold: true } } },
     { v: filteredTickets.length, 
       s: { font: { bold: true, color: { rgb: "4472C4" } }, numFmt: "#,##0" } }],
    [{ v: "Total Hours:", s: { font: { bold: true } } },
     { v: totalExpected, 
       s: { font: { bold: true, color: { rgb: "4472C4" } }, numFmt: "0.00" } }],
    [],
    
    // Breakdown by Assignee - Header
    [{ v: "BREAKDOWN BY ASSIGNEE", 
       s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
            fill: { fgColor: { rgb: "70AD47" } } } }],
    [],
    
    // Assignee table headers
    [
      { v: "Assignee", s: { font: { bold: true }, fill: { fgColor: { rgb: "E2EFDA" } } } },
      { v: "Tickets", s: { font: { bold: true }, fill: { fgColor: { rgb: "E2EFDA" } } } },
      { v: "Hours", s: { font: { bold: true }, fill: { fgColor: { rgb: "E2EFDA" } } } }
    ],
    
    // Assignee data
    ...Object.entries(ticketsByAssignee).map(([name, stats]) => [
      { v: name, s: { alignment: { horizontal: "left" } } },
      { v: stats.count, s: { numFmt: "#,##0", alignment: { horizontal: "center" } } },
      { v: stats.hours, s: { numFmt: "0.00", alignment: { horizontal: "center" } } }
    ]),
    
    [],
    
    // Breakdown by Parish - Header
    [{ v: "BREAKDOWN BY PARISH", 
       s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
            fill: { fgColor: { rgb: "ED7D31" } } } }],
    [],
    
    // Parish table headers
    [
      { v: "Parish", s: { font: { bold: true }, fill: { fgColor: { rgb: "FDE9D9" } } } },
      { v: "Tickets", s: { font: { bold: true }, fill: { fgColor: { rgb: "FDE9D9" } } } },
      { v: "Hours", s: { font: { bold: true }, fill: { fgColor: { rgb: "FDE9D9" } } } }
    ],
    
    // Parish data
    ...Object.entries(ticketsByParish).map(([name, stats]) => [
      { v: name, s: { alignment: { horizontal: "left" } } },
      { v: stats.count, s: { numFmt: "#,##0", alignment: { horizontal: "center" } } },
      { v: stats.hours, s: { numFmt: "0.00", alignment: { horizontal: "center" } } }
    ]),
    
    [],
    // Footer with generation timestamp
    [{ v: `Report generated on ${new Date().toLocaleString('en-IN')}`, 
       s: { font: { italic: true, sz: 9, color: { rgb: "666666" } } } }]
  ];

  // Create statistics sheet
  const statsSheet = XLSX.utils.aoa_to_sheet(statsSheetData);
  
  // Set column widths for stats sheet
  statsSheet['!cols'] = [
    { wch: 30 }, // First column
    { wch: 12 }, // Numbers
    { wch: 12 }  // Numbers
  ];

  // Merge title cells in stats sheet
  statsSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Title merge
    { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } }, // Assignee header merge
    { s: { r: 13, c: 0 }, e: { r: 13, c: 2 } }, // Parish header merge
  ];

  // Add statistics sheet
  XLSX.utils.book_append_sheet(wb, statsSheet, "Statistics");

  // Add a third sheet for summary charts data (optional)
  const summarySheetData = [
    ["SUMMARY DATA FOR CHARTS"],
    [],
    ["Category", "Value"],
    ["Total Tickets", filteredTickets.length],
    ["Total Hours", totalExpected],
    ["Average Hours per Ticket", filteredTickets.length ? (totalExpected / filteredTickets.length).toFixed(2) : 0],
    [],
    ["Assignee Performance"],
    ["Assignee", "Tickets", "Hours", "Avg Hours"],
    ...Object.entries(ticketsByAssignee).map(([name, stats]) => [
      name,
      stats.count,
      stats.hours,
      stats.count ? (stats.hours / stats.count).toFixed(2) : 0
    ]),
    [],
    ["Parish Distribution"],
    ["Parish", "Tickets", "Hours", "% of Total"],
    ...Object.entries(ticketsByParish).map(([name, stats]) => [
      name,
      stats.count,
      stats.hours,
      filteredTickets.length ? ((stats.count / filteredTickets.length) * 100).toFixed(2) + '%' : '0%'
    ])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary Data");

  // Generate filename with current date and time
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  const fileName = `EFIN_Report_${dateStr}_${timeStr}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fileName);

  // Show success message with details
  toast.success(
    <div>
      <strong>✅ Excel Report Exported Successfully</strong>
      <br />
      <small>Total Tickets: {filteredTickets.length}</small>
      <br />
      <small>Total Hours: {totalExpected}</small>
      <br />
      <small>File: {fileName}</small>
    </div>,
    {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    }
  );
};

  // Truncate text helper
  const truncateText = (text, maxLength = 30) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Render description cell with tooltip
  const DescriptionCell = ({ text }) => {
    if (!text) return <span className="text-muted fst-italic">-</span>;
    
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip>{text}</Tooltip>}
      >
        <span className="text-primary">
          <i className="bi bi-file-text me-1"></i>
          {truncateText(text, 20)}
        </span>
      </OverlayTrigger>
    );
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="fw-bold mb-0">
                <Badge bg="info" className="me-2">EFIN</Badge>
                Completed / Verified Tickets Report
              </h3>
              <Badge bg="secondary" pill>
                Total: {filteredTickets.length} tickets
              </Badge>
            </div>

            {/* Filters Row */}
            <Row className="g-3 mb-4">
              <Col md={2}>
                <Form.Control
                  type="text"
                  placeholder="🔍 Search..."
                  value={search}
                  onChange={handleSearch}
                />
              </Col>
              
              <Col md={2}>
                <Form.Select
                  value={selectedAssignee}
                  onChange={handleAssigneeChange}
                >
                  <option value="">All Assignees</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.gmail} value={a.gmail}>
                      {a.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              <Col md={2}>
                <Form.Select
                  value={selectedParish}
                  onChange={handleParishChange}
                  disabled={loadingParishes}
                >
                  <option value="">All Parishes</option>
                  {parishList.map((parish) => (
                    <option key={parish._id} value={parish._id}>
                      {parish.parishName}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              <Col md={2}>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => handleDateChange("start", date)}
                  placeholderText="Start Date"
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                />
              </Col>
              
              <Col md={2}>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => handleDateChange("end", date)}
                  placeholderText="End Date"
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                />
              </Col>
              
              <Col md={2} className="d-flex gap-2">
                <Button variant="success" size="sm" onClick={exportToExcel}>
                  <i className="bi bi-file-excel me-2"></i>Excel
                </Button>
                <Button variant="primary" size="sm" onClick={fetchTickets}>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                </Button>
                {(search || selectedAssignee || selectedParish || startDate || endDate) && (
                  <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </Col>
            </Row>

            {/* Summary Cards - Simplified without description counts */}
            {!loading && !error && filteredTickets.length > 0 && (
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="card bg-primary text-white">
                    <div className="card-body">
                      <h6>Total Tickets</h6>
                      <h3>{filteredTickets.length}</h3>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="card bg-success text-white">
                    <div className="card-body">
                      <h6>Total Hours</h6>
                      <h3>{totalExpected}</h3>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6>Parishes</h6>
                      <h3>{Object.keys(ticketsByParish).length}</h3>
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {/* Table */}
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading Efin tickets...</p>
              </div>
            ) : error ? (
              <Alert variant="danger" className="text-center">
                {error}
                <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchTickets}>
                  Retry
                </Button>
              </Alert>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                <p className="text-muted">No Efin tickets found</p>
                {(search || selectedAssignee || selectedParish || startDate || endDate) && (
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="table-responsive bg-white p-3 rounded shadow-sm">
                  <Table striped bordered hover className="align-middle">
                    <thead className="table-dark">
                      <tr>
                        <th onClick={() => handleSort("ticketNo")} style={{ cursor: "pointer" }}>
                          Ticket # {getSortIcon("ticketNo")}
                        </th>
                        <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                          Status {getSortIcon("status")}
                        </th>
                        <th onClick={() => handleSort("assignedToName")} style={{ cursor: "pointer" }}>
                          Assignee {getSortIcon("assignedToName")}
                        </th>
                        <th onClick={() => handleSort("parishName")} style={{ cursor: "pointer" }}>
                          Parish {getSortIcon("parishName")}
                        </th>
                        <th onClick={() => handleSort("subject")} style={{ cursor: "pointer" }}>
                          Subject {getSortIcon("subject")}
                        </th>
                        <th>Description 1</th>
                        <th>Description 2</th>
                        <th onClick={() => handleSort("expectedHours")} style={{ cursor: "pointer" }}>
                          Hours {getSortIcon("expectedHours")}
                        </th>
                        <th onClick={() => handleSort("completedTime")} style={{ cursor: "pointer" }}>
                          Completed {getSortIcon("completedTime")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.map((ticket, index) => (
                        <motion.tr
                          key={ticket._id || index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                        >
                          <td>
                            <strong>#{ticket.ticketNo}</strong>
                          </td>
                          <td>
                            <Badge bg={ticket.status === "Verified" ? "success" : "primary"}>
                              {ticket.status}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="info" pill>
                              {ticket.assignedToName}
                            </Badge>
                          </td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>{ticket.parishName}</Tooltip>}
                            >
                              <span>{truncateText(ticket.parishName, 15)}</span>
                            </OverlayTrigger>
                          </td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>{ticket.subject}</Tooltip>}
                            >
                              <span>{truncateText(ticket.subject, 20)}</span>
                            </OverlayTrigger>
                          </td>
                          <td>
                            <DescriptionCell text={ticket.descriptionEfin1} />
                          </td>
                          <td>
                            <DescriptionCell text={ticket.descriptionEfin2} />
                          </td>
                          <td className="text-center">
                            <Badge bg="secondary" pill>
                              {ticket.expectedHours || 0}
                            </Badge>
                          </td>
                          <td>
                            <small>{ticket.formattedCompletedTime}</small>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination and Info */}
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div className="text-muted">
                    Showing {indexOfFirstRow + 1} to{" "}
                    {Math.min(indexOfLastRow, filteredTickets.length)} of{" "}
                    {filteredTickets.length} entries
                  </div>
                  
                  {totalPages > 1 && (
                    <Pagination>
                      <Pagination.First
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      />
                      <Pagination.Prev
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      />

                      {windowStart > 1 && (
                        <>
                          <Pagination.Item onClick={() => setCurrentPage(1)}>
                            1
                          </Pagination.Item>
                          <Pagination.Ellipsis />
                        </>
                      )}

                      {pageNumbers.map((p) => (
                        <Pagination.Item
                          key={p}
                          active={currentPage === p}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </Pagination.Item>
                      ))}

                      {windowEnd < totalPages && (
                        <>
                          <Pagination.Ellipsis />
                          <Pagination.Item onClick={() => setCurrentPage(totalPages)}>
                            {totalPages}
                          </Pagination.Item>
                        </>
                      )}

                      <Pagination.Next
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      />
                      <Pagination.Last
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      />
                    </Pagination>
                  )}
                </div>

            
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default EfinReport;