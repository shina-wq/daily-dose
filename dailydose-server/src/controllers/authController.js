const pool = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

// register
const register = async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  try {
    // check if user already exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already in use.' })
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    )

    const user = result.rows[0]

    // generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// login
const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  try {
    // find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const user = result.rows[0]

    // check password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

// get current user
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error('GetMe error:', err.message)
    res.status(500).json({ message: 'Server error.' })
  }
}

module.exports = { register, login, getMe }