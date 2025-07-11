import React, { useState, useEffect } from 'react';
import { Form, Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

function Assigntickent() {
  const [formData, setFormData] = useState({
    projectName: '',
    subject: '',
    description: '',
    expectedHours: '',
    ticketType: '', // ✅ NEW FIELD
    file: null,
    assignedTo: '',
    assignedBy: '',
    assignedDate: '',
  });

  const [loading, setLoading] = useState(false);

  const assigneeOptions = [
    { name: 'Jeswin', gmail: 'jeswinjohn03@gmail.com' },
    { name: 'Anu Mathew', gmail: 'anu@example.com' },
    { name: 'Arun K', gmail: 'arun@example.com' },
    { name: 'Neha Joseph', gmail: 'neha@example.com' },
  ];

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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      const currentDate = new Date().toISOString();
      formData.assignedDate = currentDate;

      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      await axios.post('https://anywhereworks-backend.onrender.com/assign', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Ticket assigned and email sent');

      // ✅ Reset form (except assignedBy)
      setFormData((prev) => ({
        projectName: '',
        subject: '',
        description: '',
        expectedHours: '',
        ticketType: '',
        file: null,
        assignedTo: '',
        assignedBy: prev.assignedBy,
        assignedDate: '',
      }));
    } catch (err) {
      console.error('Ticket submission failed:', err);
      toast.error('❌ Failed to assign ticket. Please try again.');
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
                        {[
                          {
                            id: 'projectName',
                            label: 'Project Name',
                            control: (
                              <Form.Select
                                name="projectName"
                                value={formData.projectName}
                                onChange={handleChange}
                                required
                              >
                                <option value="">Select</option>
                                <option value="Catechism">Catechism</option>
                                <option value="Website">Website</option>
                                <option value="CRM">CRM</option>
                              </Form.Select>
                            ),
                          },
                          {
                            id: 'ticketType',
                            label: 'Ticket Type',
                            control: (
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
                            ),
                          },
                          {
                            id: 'subject',
                            label: 'Subject',
                            control: (
                              <Form.Control
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                              />
                            ),
                          },
                          {
                            id: 'description',
                            label: 'Description',
                            control: (
                              <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                              />
                            ),
                          },
                          {
                            id: 'file',
                            label: 'Upload File',
                            control: (
                              <Form.Control
                                type="file"
                                name="file"
                                onChange={handleChange}
                              />
                            ),
                          },
                          {
                            id: 'expectedHours',
                            label: 'Expected Hours',
                            control: (
                              <Form.Control
                                type="number"
                                name="expectedHours"
                                value={formData.expectedHours}
                                onChange={handleChange}
                                required
                              />
                            ),
                          },
                          {
                            id: 'assignedTo',
                            label: 'Assign To',
                            control: (
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
                            ),
                          },
                        ].map(({ id, label, control }) => (
                          <Form.Group key={id} as={Row} className="mb-3">
                            <Form.Label column sm={4} className="fw-semibold">
                              {label}
                            </Form.Label>
                            <Col sm={8}>{control}</Col>
                          </Form.Group>
                        ))}

                        <div className="text-center mt-4">
                          <button
                            type="submit"
                            className="btn btn-primary px-4 fw-bold"
                            disabled={loading}
                          >
                            {loading ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              'Submit'
                            )}
                          </button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </Container>
        </main>
      </div>
    </div>
  );
}

export default Assigntickent;
