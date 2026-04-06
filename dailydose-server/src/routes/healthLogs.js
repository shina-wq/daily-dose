const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/auth')
const {
  getHealthLogs,
  getHealthLog,
  getTodayLog,
  createHealthLog,
  updateHealthLog,
  deleteHealthLog,
  getRecentLogs
} = require('../controllers/healthLogController')

// all routes protected
router.use(verifyToken)

router.get('/', getHealthLogs)
router.get('/today', getTodayLog)
router.get('/recent', getRecentLogs)
router.get('/:id', getHealthLog)
router.post('/', createHealthLog)
router.put('/:id', updateHealthLog)
router.delete('/:id', deleteHealthLog)

module.exports = router