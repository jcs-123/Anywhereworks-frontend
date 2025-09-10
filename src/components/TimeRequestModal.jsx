import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';

function TimeRequestModal({ show, onHide, ticket, userId, toast }) {
  const [timeRequestData, setTimeRequestData] = useState({
    hours: '',
    reason: ''
  });

  const handleSubmit = async () => {
    try {
      await axios.post(`https://anywhereworks-backend.onrender.com/tickets/${ticket._id}/request-time`, {
        hours: timeRequestData.hours,
        reason: timeRequestData.reason,
        requestedBy: userId
      });

      toast.success('⏱️ Time request submitted!');
      setTimeRequestData({ hours: '', reason: '' });
      onHide();
    } catch (err) {
      toast.error('❌ Failed to submit time request');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>Request Additional Time</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
         <Form.Group className="mb-3">
  <Form.Label>Additional Hours Needed</Form.Label>
  <Form.Select
    value={timeRequestData.hours}
    onChange={(e) =>
      setTimeRequestData({ ...timeRequestData, hours: e.target.value })
    }
    required
  >
    <option value="">Select hours</option>
    {[1, 2, 3, 4, 5, 6].map((hour) => (
      <option key={hour} value={hour}>
        {hour}
      </option>
    ))}
  </Form.Select>
</Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Reason for Additional Time</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Explain why you need more time"
              value={timeRequestData.reason}
              onChange={(e) => setTimeRequestData({ ...timeRequestData, reason: e.target.value })}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Submit
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TimeRequestModal;
