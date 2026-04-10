const pool = require('../db')

const getMedicationId = (value) => {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

// get all medications for user
const getMedications = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM medications WHERE user_id = $1 ORDER BY time_to_take ASC',
      [req.user.id]
    )
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('getMedications error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get single medication
const getMedication = async (req, res) => {
  const medicationId = getMedicationId(req.params.id)
  if (!medicationId) {
    return res.status(400).json({ message: 'Invalid medication id.' })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM medications WHERE id = $1 AND user_id = $2',
      [medicationId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('getMedication error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// create medication
const createMedication = async (req, res) => {
  const { name, dosage, frequency, time_to_take, notes } = req.body

  if (!name || !dosage || !frequency || !time_to_take) {
    return res.status(400).json({ message: 'Name, dosage, frequency and time are required.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO medications (user_id, name, dosage, frequency, time_to_take, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, name, dosage, frequency, time_to_take, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createMedication error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// update medication
const updateMedication = async (req, res) => {
  const medicationId = getMedicationId(req.params.id)
  if (!medicationId) {
    return res.status(400).json({ message: 'Invalid medication id.' })
  }

  const { name, dosage, frequency, time_to_take, notes } = req.body

  try {
    const result = await pool.query(
      `UPDATE medications
       SET name = $1, dosage = $2, frequency = $3, time_to_take = $4, notes = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, dosage, frequency, time_to_take, notes || null, medicationId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('updateMedication error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// delete medication
const deleteMedication = async (req, res) => {
  const medicationId = getMedicationId(req.params.id)
  if (!medicationId) {
    return res.status(400).json({ message: 'Invalid medication id.' })
  }

  try {
    const result = await pool.query(
      'DELETE FROM medications WHERE id = $1 AND user_id = $2 RETURNING *',
      [medicationId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found.' })
    }
    res.status(200).json({ message: 'Medication deleted.' })
  } catch (err) {
    console.error('deleteMedication error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// log dose as taken or missed
const logDose = async (req, res) => {
  const medicationId = getMedicationId(req.params.id)
  if (!medicationId) {
    return res.status(400).json({ message: 'Invalid medication id.' })
  }

  const { status, date } = req.body

  if (!status || !date) {
    return res.status(400).json({ message: 'Status and date are required.' })
  }

  if (!['taken', 'missed', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' })
  }

  try {
    const medication = await pool.query(
      'SELECT id FROM medications WHERE id = $1 AND user_id = $2',
      [medicationId, req.user.id]
    )

    if (medication.rows.length === 0) {
      return res.status(404).json({ message: 'Medication not found.' })
    }

    // check if log already exists for this medication and date
    const existing = await pool.query(
      'SELECT * FROM medication_logs WHERE medication_id = $1 AND date = $2 AND user_id = $3',
      [medicationId, date, req.user.id]
    )

    let result
    if (existing.rows.length > 0) {
      // update existing log
      result = await pool.query(
        `UPDATE medication_logs SET status = $1
         WHERE medication_id = $2 AND date = $3 AND user_id = $4
         RETURNING *`,
        [status, medicationId, date, req.user.id]
      )
    } else {
      // create new log
      result = await pool.query(
        `INSERT INTO medication_logs (medication_id, user_id, date, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [medicationId, req.user.id, date, status]
      )
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('logDose error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get medication logs for the past 7 days
const getWeeklyLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ml.*, m.name, m.dosage
       FROM medication_logs ml
       JOIN medications m ON ml.medication_id = m.id
       WHERE ml.user_id = $1
       AND ml.date >= CURRENT_DATE - INTERVAL '6 days'
       ORDER BY ml.date DESC`,
      [req.user.id]
    )
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('getWeeklyLogs error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

module.exports = {
  getMedications,
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication,
  logDose,
  getWeeklyLogs
}