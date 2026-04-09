const { GoogleGenAI } = require('@google/genai')
const pool = require('../db')

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// build user health context
const buildHealthContext = async (userId) => {
  try {
    // get medications
    const medsResult = await pool.query(
      'SELECT * FROM medications WHERE user_id = $1 ORDER BY time_to_take ASC',
      [userId]
    )

    // get recent medication logs (last 7 days)
    const logsResult = await pool.query(
      `SELECT ml.*, m.name as med_name, m.dosage
       FROM medication_logs ml
       JOIN medications m ON ml.medication_id = m.id
       WHERE ml.user_id = $1
       AND ml.date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY ml.date DESC`,
      [userId]
    )

    // get upcoming appointments
    const apptsResult = await pool.query(
      `SELECT * FROM appointments
       WHERE user_id = $1
       AND completed = false
       AND appointment_date >= NOW()
       ORDER BY appointment_date ASC
       LIMIT 5`,
      [userId]
    )

    // get recent health logs (last 7 days)
    const healthResult = await pool.query(
      `SELECT * FROM health_logs
       WHERE user_id = $1
       AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date DESC`,
      [userId]
    )

    // get user info
    const userResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    )

    const user = userResult.rows[0]
    const medications = medsResult.rows
    const medicationLogs = logsResult.rows
    const appointments = apptsResult.rows
    const healthLogs = healthResult.rows

    // calculate weekly adherence
    const totalLogs = medicationLogs.length
    const takenLogs = medicationLogs.filter(l => l.status === 'taken').length
    const adherenceRate = totalLogs > 0
      ? Math.round((takenLogs / totalLogs) * 100)
      : 0

    // build context string
    let context = `You are a compassionate and knowledgeable AI health assistant built into DailyDose, a chronic illness management app. You are talking to ${user?.name || 'the user'}.

IMPORTANT GUIDELINES:
- You are NOT a doctor and must always remind users to consult their healthcare provider for medical decisions
- Be warm, empathetic, and supportive — the user is managing a chronic condition
- Use the health context provided to give personalized, relevant responses
- Keep responses concise and easy to read
- Never diagnose conditions or prescribe treatments
- If the user seems to be in distress or mentions an emergency, direct them to seek immediate medical help

USER'S CURRENT HEALTH CONTEXT:
`

    // medications
    if (medications.length > 0) {
      context += `\nCURRENT MEDICATIONS:\n`
      medications.forEach(med => {
        context += `- ${med.name} (${med.dosage}) — ${med.frequency} at ${med.time_to_take.slice(0, 5)}`
        if (med.notes) context += ` — Instructions: ${med.notes}`
        context += '\n'
      })
    } else {
      context += `\nCURRENT MEDICATIONS: None recorded\n`
    }

    // adherence
    context += `\nMEDICATION ADHERENCE (last 7 days): ${adherenceRate}% (${takenLogs} of ${totalLogs} doses taken)\n`

    // missed doses
    const missedLogs = medicationLogs.filter(l => l.status === 'missed')
    if (missedLogs.length > 0) {
      context += `\nMISSED DOSES THIS WEEK:\n`
      missedLogs.forEach(log => {
        context += `- ${log.med_name} on ${new Date(log.date).toISOString().split('T')[0]}\n`
      })
    }

    // upcoming appointments
    if (appointments.length > 0) {
      context += `\nUPCOMING APPOINTMENTS:\n`
      appointments.forEach(appt => {
        const date = new Date(appt.appointment_date)
        context += `- ${appt.title} with ${appt.doctor_name || 'Doctor'} on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        if (appt.location) context += ` at ${appt.location}`
        if (appt.notes) context += ` — Notes: ${appt.notes}`
        context += '\n'
      })
    } else {
      context += `\nUPCOMING APPOINTMENTS: None scheduled\n`
    }

    // recent health logs
    if (healthLogs.length > 0) {
      context += `\nRECENT HEALTH LOGS (last 7 days):\n`
      const moodLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great' }
      healthLogs.forEach(log => {
        context += `- ${log.date}: Mood: ${moodLabels[log.mood] || log.mood}, Energy: ${log.energy_level}/5`
        if (log.symptoms) context += `, Symptoms: ${log.symptoms}`
        if (log.notes) context += `, Notes: ${log.notes}`
        context += '\n'
      })
    } else {
      context += `\nRECENT HEALTH LOGS: None recorded this week\n`
    }

    return context
  } catch (err) {
    console.error('buildHealthContext error:', err)
    return 'Health context unavailable.'
  }
}

// chat endpoint
const chat = async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Messages are required.' })
  }

  try {
    const healthContext = await buildHealthContext(req.user.id)

    // gemini expects contents array — map role 'assistant' to 'model'
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const response = await client.models.generateContent({
      model: 'gemma-4-31b-it',
      config: {
        systemInstruction: healthContext,
        maxOutputTokens: 1024,
      },
      contents
    })

    res.status(200).json({
      message: response.text
    })
  } catch (err) {
    console.error('chat error:', err)
    res.status(500).json({ message: 'AI service error. Please try again.' })
  }
}

// pre-visit summary endpoint
const generatePreVisitSummary = async (req, res) => {
  const { appointmentId } = req.body

  try {
    const healthContext = await buildHealthContext(req.user.id)

    // get specific appointment if provided
    let appointmentContext = ''
    if (appointmentId) {
      const apptResult = await pool.query(
        'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
        [appointmentId, req.user.id]
      )
      if (apptResult.rows.length > 0) {
        const appt = apptResult.rows[0]
        const date = new Date(appt.appointment_date)
        appointmentContext = `\nThis summary is specifically for the appointment: ${appt.title} with ${appt.doctor_name || 'Doctor'} on ${date.toLocaleDateString()}.`
      }
    }

    const prompt = `Based on the user's health data, generate a concise Pre-Visit Summary they can share with their doctor.${appointmentContext}

The summary should include:
1. **Recent Symptoms & How I've Been Feeling** — key symptoms and mood trends from the past week
2. **Medication Adherence** — which medications were taken consistently and any missed doses
3. **Energy & Well-being Trends** — patterns in energy levels
4. **Questions to Ask My Doctor** — 3-4 suggested questions based on the health data

Format it clearly with headers and bullet points. Keep it professional but easy to read. End with a reminder that this is an AI-generated summary and should be reviewed before the appointment.`

    const response = await client.models.generateContent({
      model: 'gemma-4-31b-it',
      config: {
        systemInstruction: healthContext,
        maxOutputTokens: 1500,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    })

    res.status(200).json({
      summary: response.text
    })
  } catch (err) {
    console.error('pre-visit summary error:', err)
    res.status(500).json({ message: 'AI service error. Please try again.' })
  }
}

module.exports = { chat, generatePreVisitSummary }