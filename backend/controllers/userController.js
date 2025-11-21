const db = require('../config/db.js')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
    try {
        const { id: currentUserId } = req.token
        
        // Get current user's role
        const currentUser = await db.users.findOne({ 
            where: { id: currentUserId },
            attributes: ['role']
        })

        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const search = req.query.search || ''
        const role = req.query.role || ''
        const offset = (page - 1) * limit

        const whereClause = {}
        if (search) {
            whereClause[db.Sequelize.Op.or] = [
                { fullName: { [db.Sequelize.Op.like]: `%${search}%` } },
                { email: { [db.Sequelize.Op.like]: `%${search}%` } }
            ]
        }
        if (role) {
            whereClause.role = role
        }

        // If current user is clinic assistant, exclude superadmin users
        if (currentUser && currentUser.role === 'clinic assistant') {
            whereClause.role = { [db.Sequelize.Op.ne]: 'superadmin' }
            // If role filter is set to superadmin, return empty results
            if (role === 'superadmin') {
                return res.status(200).json({
                    users: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit,
                        hasNextPage: false,
                        hasPrevPage: false
                    }
                })
            }
            // Override role filter if it was set
            if (role && role !== 'clinic assistant') {
                whereClause.role = 'clinic assistant'
            }
        }

        const { count, rows } = await db.users.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['password'] } // Don't return password
        })

        const totalPages = Math.ceil(count / limit)

        res.status(200).json({
            users: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
}

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params
        const user = await db.users.findOne({
            where: { id },
            attributes: { exclude: ['password'] }
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({ user })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
}

// Create new user
exports.createUser = async (req, res) => {
    const { fullName, email, password, role, profileImageUrl } = req.body
    const { id: currentUserId } = req.token

    if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'Full name, email, and password are required' })
    }

    // Get current user's role
    const currentUser = await db.users.findOne({ 
        where: { id: currentUserId },
        attributes: ['role']
    })

    // Validate role
    const validRoles = ['superadmin', 'clinic assistant']
    const userRole = role || 'clinic assistant'
    if (!validRoles.includes(userRole)) {
        return res.status(400).json({ message: 'Invalid role. Must be one of: superadmin, clinic assistant' })
    }

    // Prevent clinic assistants from creating superadmin users
    if (currentUser && currentUser.role === 'clinic assistant' && userRole === 'superadmin') {
        return res.status(403).json({ message: 'You do not have permission to create superadmin users' })
    }

    try {
        const userExists = await db.users.findOne({ where: { email } })
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await db.users.create({
            id: uuidv4(),
            fullName,
            email,
            password: hashedPassword,
            role: userRole,
            profileImageUrl: profileImageUrl || null
        })

        // Return user without password
        const userResponse = user.toJSON()
        delete userResponse.password

        res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
}

// Update user
exports.updateUser = async (req, res) => {
    const { id } = req.params
    const { fullName, email, password, role, profileImageUrl } = req.body
    const { id: currentUserId } = req.token

    try {
        const user = await db.users.findOne({ where: { id } })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Get current user's role
        const currentUser = await db.users.findOne({ 
            where: { id: currentUserId },
            attributes: ['role']
        })

        // Prevent clinic assistants from updating users to superadmin
        if (currentUser && currentUser.role === 'clinic assistant' && role === 'superadmin') {
            return res.status(403).json({ message: 'You do not have permission to assign superadmin role' })
        }

        // Prevent clinic assistants from updating superadmin users
        if (currentUser && currentUser.role === 'clinic assistant' && user.role === 'superadmin') {
            return res.status(403).json({ message: 'You do not have permission to update superadmin users' })
        }

        const updateData = {}
        if (fullName) updateData.fullName = fullName
        if (email) {
            // Check if email is already taken by another user
            const emailExists = await db.users.findOne({
                where: {
                    email,
                    id: { [db.Sequelize.Op.ne]: id }
                }
            })
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' })
            }
            updateData.email = email
        }
        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }
        if (role) {
            const validRoles = ['superadmin', 'clinic assistant']
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role. Must be one of: superadmin, clinic assistant' })
            }
            updateData.role = role
        }
        if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl

        await db.users.update(updateData, { where: { id } })

        const updatedUser = await db.users.findOne({
            where: { id },
            attributes: { exclude: ['password'] }
        })

        res.status(200).json({
            message: 'User updated successfully',
            user: updatedUser
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
}

// Delete user
exports.deleteUser = async (req, res) => {
    const { id } = req.params
    const { id: currentUserId } = req.token // Get current user ID from token

    try {
        // Prevent users from deleting themselves
        if (id === currentUserId) {
            return res.status(400).json({ message: 'You cannot delete your own account' })
        }

        // Get current user's role
        const currentUser = await db.users.findOne({ 
            where: { id: currentUserId },
            attributes: ['role']
        })

        const user = await db.users.findOne({ where: { id } })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Prevent clinic assistants from deleting superadmin users
        if (currentUser && currentUser.role === 'clinic assistant' && user.role === 'superadmin') {
            return res.status(403).json({ message: 'You do not have permission to delete superadmin users' })
        }

        await db.users.destroy({ where: { id } })

        res.status(200).json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
}

