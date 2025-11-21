require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const cron = require('node-cron')

const db = require('./config/db.js')

const app = express()

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true)
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5006',
            'http://localhost:3000',
            'http://127.0.0.1:5006',
            'http://127.0.0.1:3000',
            // 'https://mywallettracker.syukrandev.com',
            process.env.FRONTEND_URL
        ].filter(Boolean) // Remove undefined values
        
        // Allow all origins in development, or check against allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

app.use(express.json())

// Test API endpoint at root
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Connected to backend API is up',
        timestamp: new Date().toISOString()
    })
})

app.use('/api/v1/auth', require('./routes/authRoutes.js'))
app.use('/api/v1/users', require('./routes/userRoutes.js'))

// Serve uploaded images folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Cron job to ping Neon database every 15 minutes to avoid inactivity pause
cron.schedule('*/15 * * * *', async () => {
    try {
        // Simple query to keep the database connection alive
        await db.sequelize.query('SELECT 1')
        console.log(`[${new Date().toISOString()}] Database ping successful - keeping connection alive`)
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Database ping failed:`, error.message)
    }
}, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Kuala_Lumpur'
})

// Run initial ping on server start
db.sequelize.query('SELECT 1')
    .then(() => {
        console.log('Initial database connection verified')
    })
    .catch(err => {
        console.error('Initial database ping failed:', err.message)
    })

const PORT = process.env.PORT

app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`)
    console.log('Database keep-alive cron job scheduled: every 15 minutes')
})