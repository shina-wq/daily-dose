const pool = require('../db')

// get all health logs for user
const getHealthLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM health_logs
       WHERE user_id = $1
       ORDER BY date DESC`,
      [req.user.id]
    )
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('getHealthLogs error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get single health log
const getHealthLog = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM health_logs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Health log not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('getHealthLog error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get today's health log
const getTodayLog = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM health_logs
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    )
    res.status(200).json(result.rows[0] || null)
  } catch (err) {
    console.error('getTodayLog error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// create health log
const createHealthLog = async (req, res) => {
  const { date, energy_level, mood, symptoms, notes } = req.body

  if (!date || !energy_level || !mood) {
    return res.status(400).json({ message: 'Date, energy level and mood are required.' })
  }

  try {
    // check if log already exists for today
    const existing = await pool.query(
      'SELECT * FROM health_logs WHERE user_id = $1 AND date = $2',
      [req.user.id, date]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'A health log already exists for this date.' })
    }

    const result = await pool.query(
      `INSERT INTO health_logs (user_id, date, energy_level, mood, symptoms, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, date, energy_level, mood, symptoms || null, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('createHealthLog error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// update health log
const updateHealthLog = async (req, res) => {
  const { energy_level, mood, symptoms, notes } = req.body

  try {
    const result = await pool.query(
      `UPDATE health_logs
       SET energy_level = $1, mood = $2, symptoms = $3, notes = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [energy_level, mood, symptoms || null, notes || null, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Health log not found.' })
    }
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('updateHealthLog error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// delete health log
const deleteHealthLog = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM health_logs WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Health log not found.' })
    }
    res.status(200).json({ message: 'Health log deleted.' })
  } catch (err) {
    console.error('deleteHealthLog error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get recent logs (last 7 days)
const getRecentLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM health_logs
       WHERE user_id = $1
       AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date DESC`,
      [req.user.id]
    )
    res.status(200).json(result.rows)
  } catch (err) {
    console.error('getRecentLogs error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

module.exports = {
  getHealthLogs,
  getHealthLog,
  getTodayLog,
  createHealthLog,
  updateHealthLog,
  deleteHealthLog,
  getRecentLogs
}