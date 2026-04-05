const express = require('express')
const cors = require('cors')
require('dotenv').config()
require('./db')

const authRoutes = require('./routes/auth')
const medicationRoutes = require('./routes/medications')

const app = express()

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// routes
app.use('/api/auth', authRoutes)
app.use('/api/medications', medicationRoutes)

// test route
app.get('/', (req, res) => {
  res.json({ message: 'DailyDose server is running 🚀' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})