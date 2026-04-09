const express = require('express')
const cors = require('cors')
require('dotenv').config()
require('./db')

const authRoutes = require('./routes/auth')
const medicationRoutes = require('./routes/medications')
const appointmentRoutes = require('./routes/appointments')
const healthLogRoutes = require('./routes/healthLogs')
const aiRoutes = require('./routes/ai')

const app = express()

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// routes
app.use('/api/auth', authRoutes)
app.use('/api/medications', medicationRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/health-logs', healthLogRoutes)
app.use('/api/ai', aiRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})