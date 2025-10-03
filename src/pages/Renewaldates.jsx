import React, { useMemo, useState, useEffect } from "react";
import {
  Container, Card, Table, Form, Button, Modal, Badge,
  InputGroup, Alert, Spinner, ListGroup
} from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaLink, FaBell, FaExclamationTriangle } from "react-icons/fa";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

// ===== Helpers =====
const API_BASE = "https://anywhereworks-backend.onrender.com";
const SNOOZE_KEY = "renewal_banner_snooze_date"; // yyyy-mm-dd

const dateDiffInDays = (aISO, bISO = new Date().toISOString().slice(0, 10)) => {
  const a = new Date(aISO);
  const b = new Date(bISO);
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const badgeForDays = (days) => {
  if (days < 0) return { variant: "dark", label: "Expired" };
  if (days === 0) return { variant: "danger", label: "Due Today" };
  if (days <= 7) return { variant: "danger", label: `${days} days` };
  if (days <= 30) return { variant: "warning", label: `${days} days` };
  if (days <= 60) return { variant: "info", label: `${days} days` };
  return { variant: "secondary", label: `${days} days` };
};

const rowVariant = (days) => {
  if (days < 0) return "table-dark";
  if (days === 0) return "table-danger";
  if (days <= 7) return "table-danger";
  if (days <= 30) return "table-warning";
  if (days <= 60) return "table-info";
  return "";
};

const getNotificationLevel = (days) => {
  if (days < 0) return { type: "error", message: "EXPIRED" };
  if (days === 0) return { type: "error", message: "DUE TODAY" };
  if (days <= 7) return { type: "warning", message: "DUE SOON" };
  if (days <= 30) return { type: "info", message: "UPCOMING" };
  return null;
};

const emptyEdit = {
  _id: null,
  name: "",
  type: "Domain",
  description: "",
  project: "",
  renewalDate: "",
};

export default function Renewaldates() {
  // data & ui state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // alerts state
  const [dueSoon, setDueSoon] = useState([]);
  const [expired, setExpired] = useState([]);
  const [showBanner, setShowBanner] = useState(false);

  // modals
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(emptyEdit);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [showNotif, setShowNotif] = useState(false);

  const [query, setQuery] = useState("");

  useEffect(() => { document.title = "Renewal Dates"; }, []);

  // --- Fetch list ---
  const fetchRows = async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/renewals`, {
        params: { q: q.trim(), sortBy: "renewalDate", order: "asc", page: 1, limit: 500 },
      });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load renewals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch alerts ---
  const fetchAlerts = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/renewals/alerts`, { 
        params: { days: 30 } // Increased to 30 days for better coverage
      });
      const ex = Array.isArray(data?.expired) ? data.expired : [];
      const ds = Array.isArray(data?.dueSoon) ? data.dueSoon : [];
      setExpired(ex);
      setDueSoon(ds);

      // Show toast notifications for urgent items
      [...ex, ...ds].forEach((item) => {
        const days = dateDiffInDays(item.renewalDate);
        const notification = getNotificationLevel(days);
        
        if (notification) {
          if (days < 0) {
            toast.error(`${item.name} has EXPIRED!`, {
              position: "top-right",
              autoClose: 8000,
            });
          } else if (days === 0) {
            toast.error(`${item.name} is due TODAY!`, {
              position: "top-right",
              autoClose: 8000,
            });
          } else if (days <= 7) {
            toast.warn(`${item.name} due in ${days} days`, {
              position: "top-right",
              autoClose: 6000,
            });
          }
        }
      });

      // Show banner if there are urgent notifications
      const today = new Date().toISOString().slice(0, 10);
      const snoozed = localStorage.getItem(SNOOZE_KEY);
      const hasUrgentAlerts = ex.length > 0 || ds.some(item => {
        const days = dateDiffInDays(item.renewalDate);
        return days <= 7;
      });
      
      if (hasUrgentAlerts && snoozed !== today) {
        setShowBanner(true);
      }
    } catch (err) {
      console.warn("Alerts fetch failed:", err?.message);
    }
  };

  const snoozeBanner = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(SNOOZE_KEY, today);
    setShowBanner(false);
    toast.info("Notifications snoozed for today");
  };

  useEffect(() => {
    fetchRows("");
    fetchAlerts();
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchRows(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate)),
    [rows]
  );

  // Handlers
  const openAdd = () => { setEditing(emptyEdit); setShowEdit(true); };
  const openEdit = (row) => {
    setEditing({
      _id: row._id ?? null,
      name: row.name ?? "",
      type: row.type ?? "Domain",
      description: row.description ?? "",
      project: row.project ?? "",
      renewalDate: row.renewalDate ? new Date(row.renewalDate).toISOString().slice(0, 10) : "",
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editing.name || !editing.renewalDate) {
      toast.error("Name and Renewal Date are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: editing.name,
        type: editing.type,
        description: editing.description,
        project: editing.project,
        renewalDate: editing.renewalDate,
      };
      if (editing._id) {
        const { data: updated } = await axios.put(`${API_BASE}/renewals/${editing._id}`, payload);
        setRows(prev => prev.map(r => (r._id === editing._id ? updated : r)));
        toast.success("Renewal updated successfully!");
      } else {
        const { data: created } = await axios.post(`${API_BASE}/renewals`, payload);
        setRows(prev => [...prev, created]);
        toast.success("Renewal added successfully!");
      }
      setShowEdit(false);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Save failed.");
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row) => { setToDelete(row); setShowDelete(true); };
  const doDelete = async () => {
    if (!toDelete?._id) return;
    setDeleting(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE}/renewals/${toDelete._id}`);
      setRows(prev => prev.filter(r => r._id !== toDelete._id));
      toast.success(`${toDelete.name} deleted.`);
      setShowDelete(false);
      setToDelete(null);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Delete failed.");
      toast.error("Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  // Get urgent count for notification bell
  const urgentCount = useMemo(() => {
    return expired.length + dueSoon.filter(item => {
      const days = dateDiffInDays(item.renewalDate);
      return days <= 7;
    }).length;
  }, [expired, dueSoon]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar />

        <main className="flex-grow-1 p-4 bg-light">
          {/* 🔔 Notification Bell */}
          <div className="d-flex justify-content-end mb-3">
            <Button
              variant="outline-dark"
              className="rounded-circle position-relative"
              onClick={() => setShowNotif(true)}
            >
              <FaBell />
              {urgentCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {urgentCount}
                </span>
              )}
            </Button>
          </div>

          {/* Banner */}
          <AnimatePresence initial={false}>
            {showBanner && (expired.length > 0 || dueSoon.some(item => dateDiffInDays(item.renewalDate) <= 7)) && (
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Alert 
                  variant={expired.length > 0 ? "danger" : "warning"} 
                  className="rounded-3 shadow-sm d-flex justify-content-between align-items-center"
                >
                  <div>
                    <FaExclamationTriangle className="me-2" />
                    <strong>
                      {expired.length > 0 
                        ? `${expired.length} renewal(s) have expired!` 
                        : `${dueSoon.filter(item => dateDiffInDays(item.renewalDate) <= 7).length} renewal(s) due soon!`
                      }
                    </strong>
                  </div>
                  <div>
                    <Button variant="outline-dark" size="sm" onClick={snoozeBanner} className="me-2">
                      Snooze for today
                    </Button>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowNotif(true)}>
                      View Details
                    </Button>
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <Container fluid className="py-2">
            <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
              <Card.Header className="bg-white border-0 pt-4 pb-3">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <motion.h4 className="m-0 fw-bold">Renewal Dates</motion.h4>
                  <div className="d-flex gap-2">
                    <InputGroup style={{ minWidth: 280 }}>
                      <InputGroup.Text><FaSearch /></InputGroup.Text>
                      <Form.Control
                        placeholder="Search name, project, description…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </InputGroup>
                    <Button variant="primary" className="fw-semibold" onClick={openAdd}>
                      <FaPlus className="me-2" /> Add
                    </Button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="align-middle m-0">
                    <thead className="table-dark sticky-top">
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Project</th>
                        <th>Renewal Date</th>
                        <th>Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="text-center py-5"><Spinner animation="border" /></td></tr>
                      ) : sorted.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-5 text-muted">No records found.</td></tr>
                      ) : (
                        sorted.map((r, idx) => {
                          const days = dateDiffInDays(r.renewalDate);
                          const badge = badgeForDays(days);
                          const notification = getNotificationLevel(days);
                          
                          return (
                            <tr key={r._id} className={rowVariant(days)}>
                              <td>{idx + 1}</td>
                              <td className="fw-semibold">{r.name}</td>
                              <td><span className="badge bg-secondary">{r.type}</span></td>
                              <td>{r.description}</td>
                              <td>
                                {r.project ? (
                                  r.project.startsWith('http') ? (
                                    <a href={r.project} target="_blank" rel="noreferrer" className="text-decoration-none">
                                      <FaLink className="me-1" />Link
                                    </a>
                                  ) : (
                                    r.project
                                  )
                                ) : "—"}
                              </td>
                              <td>
                                {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : "—"}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Badge bg={badge.variant}>{badge.label}</Badge>
                                  {notification && (
                                    <FaExclamationTriangle 
                                      className={days <= 0 ? "text-danger" : "text-warning"} 
                                      title={notification.message} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                <Button size="sm" variant="outline-primary" onClick={() => openEdit(r)}>
                                  <FaEdit />
                                </Button>{" "}
                                <Button size="sm" variant="outline-danger" onClick={() => confirmDelete(r)}>
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Container>
        </main>
      </div>

      {/* Add/Edit Modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editing._id ? "Edit Renewal" : "Add Renewal"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <Form.Group>
              <Form.Label>Name *</Form.Label>
              <Form.Control
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              >
                <option>Domain</option>
                <option>Hosting</option>
                <option>SSL</option>
                <option>Software</option>
                <option>Service</option>
                <option>Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Enter description"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Project (URL or Name)</Form.Label>
              <Form.Control
                value={editing.project}
                onChange={(e) => setEditing({ ...editing, project: e.target.value })}
                placeholder="https://example.com or Project Name"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Renewal Date *</Form.Label>
              <Form.Control
                type="date"
                value={editing.renewalDate}
                onChange={(e) => setEditing({ ...editing, renewalDate: e.target.value })}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit} disabled={saving || !editing.name || !editing.renewalDate}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete ? (
            <>Are you sure you want to delete <strong>{toDelete.name}</strong> ({toDelete.type})?</>
          ) : "Nothing selected."}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={doDelete} disabled={deleting}>
            {deleting ? <Spinner size="sm" /> : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Notification Modal */}
      <Modal show={showNotif} onHide={() => setShowNotif(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Renewal Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {expired.length === 0 && dueSoon.length === 0 ? (
              <ListGroup.Item className="text-center text-muted py-4">
                No upcoming or expired renewals.
              </ListGroup.Item>
            ) : (
              <>
                {expired.length > 0 && (
                  <>
                    <ListGroup.Item className="bg-light fw-bold">EXPIRED</ListGroup.Item>
                    {expired.map(item => {
                      const days = dateDiffInDays(item.renewalDate);
                      return (
                        <ListGroup.Item key={item._id} className="d-flex justify-content-between align-items-center">
                          <div>
                            <FaExclamationTriangle className="text-danger me-2" />
                            <strong>{item.name}</strong> 
                            <small className="text-muted ms-2">({item.type})</small>
                            <br />
                            <small>Due: {new Date(item.renewalDate).toLocaleDateString()}</small>
                          </div>
                          <Badge bg="danger">Expired {Math.abs(days)} days ago</Badge>
                        </ListGroup.Item>
                      );
                    })}
                  </>
                )}
                
                {dueSoon.filter(item => dateDiffInDays(item.renewalDate) <= 7).length > 0 && (
                  <>
                    <ListGroup.Item className="bg-light fw-bold">DUE WITHIN 7 DAYS</ListGroup.Item>
                    {dueSoon
                      .filter(item => dateDiffInDays(item.renewalDate) <= 7)
                      .map(item => {
                        const days = dateDiffInDays(item.renewalDate);
                        return (
                          <ListGroup.Item key={item._id} className="d-flex justify-content-between align-items-center">
                            <div>
                              <FaExclamationTriangle className="text-warning me-2" />
                              <strong>{item.name}</strong> 
                              <small className="text-muted ms-2">({item.type})</small>
                              <br />
                              <small>Due: {new Date(item.renewalDate).toLocaleDateString()}</small>
                            </div>
                            <Badge bg="warning">{days === 0 ? "Due Today" : `${days} days`}</Badge>
                          </ListGroup.Item>
                        );
                      })
                    }
                  </>
                )}

                {dueSoon.filter(item => dateDiffInDays(item.renewalDate) > 7 && dateDiffInDays(item.renewalDate) <= 30).length > 0 && (
                  <>
                    <ListGroup.Item className="bg-light fw-bold">UPCOMING (8-30 DAYS)</ListGroup.Item>
                    {dueSoon
                      .filter(item => dateDiffInDays(item.renewalDate) > 7 && dateDiffInDays(item.renewalDate) <= 30)
                      .map(item => {
                        const days = dateDiffInDays(item.renewalDate);
                        return (
                          <ListGroup.Item key={item._id} className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{item.name}</strong> 
                              <small className="text-muted ms-2">({item.type})</small>
                              <br />
                              <small>Due: {new Date(item.renewalDate).toLocaleDateString()}</small>
                            </div>
                            <Badge bg="info">{days} days</Badge>
                          </ListGroup.Item>
                        );
                      })
                    }
                  </>
                )}
              </>
            )}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowNotif(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toastify Container */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}