import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Table,
  Form,
  Button,
  Modal,
  Spinner,
  Badge,
  Row,
  Col,
} from "react-bootstrap";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import axios from "axios";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const API_BASE = "https://anywhereworks-backend.onrender.com/amc";
const PROJECT_API = "https://anywhereworks-backend.onrender.com/all";

const emptyForm = {
  _id: null,
  projectName: "",
  description: "",
  amount: "",
  renewalDate: "",
};

function Amcrenewal() {
  const [rows, setRows] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // =============================
  // Fetch AMC Data
  // =============================
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_BASE);
      setRows(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // Fetch Projects
  // =============================
  const fetchProjects = async () => {
    try {
      setProjectLoading(true);
      const res = await axios.get(PROJECT_API);

      const projects = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setProjectList(projects);
    } catch (err) {
      console.error("Project fetch failed:", err);
    } finally {
      setProjectLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProjects();
  }, []);

  // =============================
  // Date Difference
  // =============================
  const getDaysDiff = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target - today) / (1000 * 60 * 60 * 24));
  };

  // =============================
  // Modal Controls
  // =============================
  const openAdd = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setForm({
      _id: row._id,
      projectName: row.projectName,
      description: row.description,
      amount: row.amount,
      renewalDate: row.renewalDate?.slice(0, 10),
    });
    setShowModal(true);
  };

  const saveData = async () => {
    if (!form.projectName || !form.renewalDate || !form.amount) {
      alert("Project, Amount and Date required");
      return;
    }

    try {
      if (form._id) {
        await axios.put(`${API_BASE}/${form._id}`, form);
      } else {
        await axios.post(API_BASE, form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const deleteRow = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`${API_BASE}/${id}`);
    fetchData();
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-grow-1">
        <Sidebar />

        <main className="flex-grow-1 p-4 bg-light">
          <Container fluid>
            <Card className="shadow-sm border-0 rounded-4">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h4 className="fw-bold m-0">AMC Renewal</h4>
                <Button onClick={openAdd}>
                  <FaPlus className="me-2" /> Add AMC
                </Button>
              </Card.Header>

              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="m-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Project</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Renewal Date</th>
                        <th>Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            <Spinner animation="border" />
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No AMC Records Found
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, index) => {
                          const days = getDaysDiff(r.renewalDate);

                          let borderColor = "#28a745";
                          let badge;

                          if (r.status === "Pending" || days < 0) {
                            borderColor = "#dc3545";
                            badge = <Badge bg="danger">Expired</Badge>;
                          } else if (days <= 15) {
                            borderColor = "#fd7e14";
                            badge = (
                              <Badge bg="warning" text="dark">
                                Renewal Soon
                              </Badge>
                            );
                          } else {
                            badge = <Badge bg="success">Active</Badge>;
                          }

                          return (
                            <tr
                              key={r._id}
                              style={{
                                borderLeft: `6px solid ${borderColor}`,
                                transition: "all 0.3s ease",
                              }}
                              className="amc-row"
                            >
                              <td>{index + 1}</td>
                              <td>{r.projectName}</td>
                              <td>{r.description || "—"}</td>
                              <td>₹ {r.amount}</td>
                              <td>
                                {new Date(r.renewalDate).toLocaleDateString()}
                              </td>
                              <td>{badge}</td>
                              <td className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => openEdit(r)}
                                >
                                  <FaEdit />
                                </Button>{" "}
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => deleteRow(r._id)}
                                >
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

      {/* ============================= */}
      {/* Responsive Modal */}
      {/* ============================= */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
        scrollable
        dialogClassName="amc-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {form._id ? "Edit AMC" : "Add AMC"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Row className="g-3">

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Project Name *</Form.Label>
                  <Form.Select
                    value={form.projectName}
                    onChange={(e) =>
                      setForm({ ...form, projectName: e.target.value })
                    }
                    required
                  >
                    <option value="">
                      {projectLoading ? "Loading..." : "Select Project"}
                    </option>

                    {!projectLoading &&
                      [...projectList]
                        .filter(p => p?.projectName)
                        .sort((a, b) =>
                          a.projectName.toLowerCase().localeCompare(
                            b.projectName.toLowerCase()
                          )
                        )
                        .map((proj) => (
                          <option key={proj._id} value={proj.projectName}>
                            {proj.projectName}
                          </option>
                        ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Amount *</Form.Label>
                  <Form.Control
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Renewal Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.renewalDate}
                    onChange={(e) =>
                      setForm({ ...form, renewalDate: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button
            variant="secondary"
            className="w-100 w-sm-auto"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            className="w-100 w-sm-auto"
            onClick={saveData}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Animation CSS */}
      <style>
        {`
          .amc-row:hover {
            transform: scale(1.01);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }

          .amc-modal .modal-dialog {
            max-width: 95%;
          }

          @media (min-width: 768px) {
            .amc-modal .modal-dialog {
              max-width: 700px;
            }
          }

          .modal-content {
            border-radius: 16px;
          }
        `}
      </style>
    </div>
  );
}

export default Amcrenewal;
