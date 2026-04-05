const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/auth')
const {
  getMedications,
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication,
  logDose,
  getWeeklyLogs
} = require('../controllers/medicationsController')

// all routes protected
router.use(verifyToken)

router.get('/', getMedications)
router.get('/logs/weekly', getWeeklyLogs)
router.get('/:id', getMedication)
router.post('/', createMedication)
router.put('/:id', updateMedication)
router.delete('/:id', deleteMedication)
router.post('/:id/log', logDose)

module.exports = router