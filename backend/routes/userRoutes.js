const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/authMiddleware.js')
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController.js')

// All routes require authentication
router.get('/', verifyToken, getAllUsers)
router.get('/:id', verifyToken, getUserById)
router.post('/', verifyToken, createUser)
router.put('/:id', verifyToken, updateUser)
router.delete('/:id', verifyToken, deleteUser)

module.exports = router

