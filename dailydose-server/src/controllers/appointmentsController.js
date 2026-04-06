const pool = require('../db')

// get all appointments for user
const getAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE user_id = $1
       ORDER BY appointment_date ASC`,
      [req.user.id]
    )
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('getAppointments error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get single appointment
const getAppointment = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('getAppointment error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// create appointment
const createAppointment = async (req, res) => {
  const { title, doctor_name, location, appointment_date, notes } = req.body

  if (!title || !appointment_date) {
    return res.status(400).json({ message: 'Title and date are required.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, title, doctor_name, location, appointment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, title, doctor_name || null, location || null, appointment_date, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createAppointment error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// update appointment
const updateAppointment = async (req, res) => {
  const { title, doctor_name, location, appointment_date, notes, completed } = req.body

  try {
    const result = await pool.query(
      `UPDATE appointments
       SET title = $1, doctor_name = $2, location = $3, 
           appointment_date = $4, notes = $5, completed = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, doctor_name || null, location || null, appointment_date, notes || null, completed, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('updateAppointment error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' })
    }
    res.status(200).json({ message: 'Appointment deleted.' })
  } catch (err) {
    console.error('deleteAppointment error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// mark appointment as completed
const completeAppointment = async (req, res) => {
  const { notes } = req.body

  try {
    const result = await pool.query(
      `UPDATE appointments
       SET completed = true, notes = COALESCE($1, notes)
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [notes || null, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('completeAppointment error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

module.exports = {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  completeAppointment
}