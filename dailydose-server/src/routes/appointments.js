const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/auth')
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  completeAppointment
} = require('../controllers/appointmentsController')

// all routes protected
router.use(verifyToken)

router.get('/', getAppointments)
router.get('/:id', getAppointment)
router.post('/', createAppointment)
router.put('/:id', updateAppointment)
router.delete('/:id', deleteAppointment)
router.patch('/:id/complete', completeAppointment)

module.exports = router