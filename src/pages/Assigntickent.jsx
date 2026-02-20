import React, { useState, useEffect, useRef } from "react";
import { Form, Container, Row, Col, Card, Spinner, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Modal } from 'react-bootstrap';

function Assigntickent() {
  // Initial empty state
  const initialFormState = {
    projectName: '',
    subject: '',
    description: '',
    expectedHours: '',
    ticketType: '',
    file: null,
    assignedTo: '',
    assignedBy: '',
    assignedDate: '',
    parishName: '', // Added missing field
  };

  const [formData, setFormData] = useState(initialFormState);
  const [parishList, setParishList] = useState([]);
  const [showParishModal, setShowParishModal] = useState(false);
  const [newParishName, setNewParishName] = useState('');
  const [editingParishId, setEditingParishId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectList, setProjectList] = useState([]);
  
  const fileInputRef = useRef(null);

  const assigneeOptions = [
    { name: 'Merin', gmail: 'merinjdominic@jecc.ac.in' },
    { name: 'Sandra', gmail: 'sandraps@jecc.ac.in' },
    { name: 'Deepthi', gmail: 'deepthimohan@jecc.ac.in' },
    { name: 'Jeswin', gmail: 'jeswinjohn@jecc.ac.in' },
    { name: 'Pravitha', gmail: 'pravithacp@jecc.ac.in' },
    { name: 'Hima', gmail: 'himappradeep@jecc.ac.in' },
    { name: 'anjiya', gmail: 'anjiyapj@gmail.com' },
  ];

  // Use the production URL directly since process.env is not working
  const API_BASE_URL = 'https://anywhereworks-backend.onrender.com';

  // Fetch parishes
  useEffect(() => {
    fetchParishes();
  }, []);

  const fetchParishes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/parish/`);
      setParishList(res.data);
    } catch (err) {
      console.error("Parish fetch error", err);
      toast.error("Failed to load parishes");
    }
  };

  // Set assigned by from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    try {
      const user = JSON.parse(userStr);
      if (user?.name) {
        setFormData((prev) => ({
          ...prev,
          assignedBy: user.name,
        }));
      }
    } catch (error) {
      console.error('Invalid JSON in localStorage:', error);
    }
  }, []);

  // Fetch projects
  useEffect(() => {
    axios.get(`${API_BASE_URL}/all`)
      .then(res => setProjectList(res.data))
      .catch(err => {
        console.error('Failed to fetch projects', err);
        toast.error("Failed to load projects");
      });
  }, []); // Removed API_BASE_URL dependency since it's constant

  const handleSaveParish = async () => {
    if (!newParishName.trim()) {
      toast.warning("Please enter a parish name");
      return;
    }

    try {
      if (editingParishId) {
        await axios.put(
          `${API_BASE_URL}/parish/edit/${editingParishId}`,
          { parishName: newParishName }
        );
        toast.success("Parish updated successfully");
      } else {
        await axios.post(
          `${API_BASE_URL}/parish/add`,
          { parishName: newParishName }
        );
        toast.success("Parish added successfully");
      }

      await fetchParishes();
      setShowParishModal(false);
      setNewParishName("");
      setEditingParishId(null);
    } catch (err) {
      toast.error("Failed to save parish");
      console.error(err);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      toast.warning("Please enter a project name");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/add`, { 
        projectName: newProjectName 
      });
      toast.success('✅ Project added successfully');
      setProjectList(prev => [...prev, res.data.project]);
      setFormData(prev => ({ ...prev, projectName: newProjectName }));
      setShowModal(false);
      setNewProjectName('');
    } catch (error) {
      toast.error('❌ Failed to add project');
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleClear = () => {
    setFormData({
      ...initialFormState,
      assignedBy: formData.assignedBy, // Preserve the assignedBy
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    toast.info("Form cleared");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentDate = new Date().toISOString();
      const dataToSend = { ...formData, assignedDate: currentDate };

      const data = new FormData();

      // Append normal fields
      Object.entries(dataToSend).forEach(([key, value]) => {
        if (key !== "file" && value) {
          data.append(key, value);
        }
      });

      // Append file if exists
      if (formData.file) {
        data.append("file", formData.file);
      }

      await axios.post(
        `${API_BASE_URL}/assign`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success("✅ Ticket assigned successfully");
      
      // Clear form after successful submission
      handleClear();

    } catch (err) {
      console.error("Submission error:", err);
      
      if (err.response) {
        console.error("Backend error:", err.response.data);
        toast.error(`❌ ${err.response.data.message || "Failed to assign ticket"}`);
      } else if (err.request) {
        toast.error("❌ No response from server");
      } else {
        toast.error("❌ Failed to assign ticket. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light">
          <ToastContainer position="top-right" autoClose={3000} />
          <Container fluid className="py-4">
            <Row className="justify-content-center">
              <Col xs={12} sm={11} md={9} lg={8} xl={8}>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Card className="shadow-sm rounded-4">
                    <Card.Body className="p-4">
                      <motion.h4 className="mb-4 fw-bold text-center">
                        Assign Ticket
                      </motion.h4>

                      <Form onSubmit={handleSubmit}>
                        {/* Project Name Field */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Project Name
                          </Form.Label>
                          <Col sm={8}>
                            <Row className="g-2">
                              <Col xs={12} md={8}>
                                <Form.Select
                                  name="projectName"
                                  value={formData.projectName}
                                  onChange={(e) => {
                                    const selectedProject = e.target.value;
                                    setFormData(prev => ({
                                      ...prev,
                                      projectName: selectedProject,
                                      parishName: "",
                                    }));
                                  }}
                                  required
                                >
                                  <option value="">Select Project</option>
                                  {[...projectList]
                                    .sort((a, b) => a.projectName.localeCompare(b.projectName))
                                    .map((proj) => (
                                      <option key={proj._id} value={proj.projectName}>
                                        {proj.projectName}
                                      </option>
                                    ))}
                                </Form.Select>
                              </Col>
                              <Col xs={12} md={4}>
                                <Button
                                  variant="outline-primary"
                                  onClick={() => setShowModal(true)}
                                  className="w-100"
                                  size="sm"
                                >
                                  + Add Project
                                </Button>
                              </Col>
                            </Row>
                          </Col>
                        </Form.Group>

                        {/* Parish Section for Efin Project */}
                        {formData.projectName === "Efin" && (
                          <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={4} className="fw-semibold">
                              Parish Name
                            </Form.Label>
                            <Col sm={8}>
                              <Form.Select
                                value={formData.parishName}
                                onChange={(e) => {
                                  const selectedParish = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    parishName: selectedParish,
                                    subject: selectedParish
                                  }));
                                }}
                                required
                              >
                                <option value="">Select Parish</option>
                                {parishList.map((p) => (
                                  <option key={p._id} value={p.parishName}>
                                    {p.parishName}
                                  </option>
                                ))}
                              </Form.Select>
                              <div className="d-flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => {
                                    setEditingParishId(null);
                                    setNewParishName("");
                                    setShowParishModal(true);
                                  }}
                                >
                                  + Add Parish
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  onClick={() => {
                                    const selected = parishList.find(
                                      p => p.parishName === formData.parishName
                                    );
                                    if (!selected) {
                                      toast.warning("Please select a parish first");
                                      return;
                                    }
                                    setEditingParishId(selected._id);
                                    setNewParishName(selected.parishName);
                                    setShowParishModal(true);
                                  }}
                                >
                                  Edit Parish
                                </Button>
                              </div>
                            </Col>
                          </Form.Group>
                        )}

                        {/* Ticket Type */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Ticket Type
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Select
                              name="ticketType"
                              value={formData.ticketType}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select</option>
                              <option value="Development">Development</option>
                              <option value="Maintenance">Maintenance</option>
                            </Form.Select>
                          </Col>
                        </Form.Group>

                        {/* Subject */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Subject
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Control
                              type="text"
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              required
                            />
                          </Col>
                        </Form.Group>

                        {/* Description */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Description
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              required
                            />
                          </Col>
                        </Form.Group>

                        {/* File Upload */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Upload File
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Control
                              type="file"
                              name="file"
                              ref={fileInputRef}
                              onChange={handleChange}
                            />
                          </Col>
                        </Form.Group>

                        {/* Expected Hours */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Expected Hours
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Select
                              name="expectedHours"
                              value={formData.expectedHours}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select hours</option>
                              {[1, 2, 3, 4, 5, 6].map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </Form.Select>
                          </Col>
                        </Form.Group>

                        {/* Assign To */}
                        <Form.Group as={Row} className="mb-3">
                          <Form.Label column sm={4} className="fw-semibold">
                            Assign To
                          </Form.Label>
                          <Col sm={8}>
                            <Form.Select
                              name="assignedTo"
                              value={formData.assignedTo}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Assignee</option>
                              {assigneeOptions.map((a, i) => (
                                <option key={i} value={a.gmail}>
                                  {a.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Col>
                        </Form.Group>

                        {/* Form Actions */}
                        <div className="d-flex gap-3 justify-content-center mt-4">
                          <Button
                            type="submit"
                            variant="primary"
                            className="px-4 fw-bold"
                            disabled={loading}
                          >
                            {loading ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              'Submit'
                            )}
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline-secondary"
                            className="px-4 fw-bold"
                            onClick={handleClear}
                            disabled={loading}
                          >
                            Clear
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            </Row>

            {/* Add Project Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>Add New Project</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form.Group>
                  <Form.Label>Project Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddProject}>
                  Add
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Add/Edit Parish Modal */}
            <Modal show={showParishModal} onHide={() => setShowParishModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>
                  {editingParishId ? "Edit Parish" : "Add Parish"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form.Control
                  type="text"
                  value={newParishName}
                  onChange={(e) => setNewParishName(e.target.value)}
                  placeholder="Enter parish name"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowParishModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveParish}>
                  {editingParishId ? "Update" : "Add"}
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </main>
      </div>
    </div>
  );
}

export default Assigntickent;