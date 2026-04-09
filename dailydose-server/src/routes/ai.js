const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/auth')
const { chat, generatePreVisitSummary } = require('../controllers/aiController')

router.use(verifyToken)

router.post('/chat', chat)
router.post('/pre-visit-summary', generatePreVisitSummary)

module.exports = router