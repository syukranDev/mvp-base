const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/authMiddleware.js')
const { upload } = require('../middlewares/uploadMiddleware.js')
const db = require('../config/db.js')

const { 
   loginUser, 
   getUserInfo,
   updateProfileImage } = require('../controllers/authController.js')


router.post('/login', loginUser)
router.get('/getUser', verifyToken, getUserInfo)

router.post('/uploadProfileImage', upload.single('image'), verifyToken, async (req, res) => {
   if(!req.file) return res.status(400).json({ message: 'No file uploaded' })

   const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
   
   // Update user's profile image URL
   const { id } = req.token
   try {
       await db.users.update(
           { profileImageUrl: imageUrl },
           { where: { id } }
       )
       
       const updatedUser = await db.users.findOne({ where: { id } })
       res.status(200).json({ 
           message: 'Profile image uploaded successfully', 
           imageUrl,
           user: updatedUser
       })
   } catch (error) {
       console.error(error)
       res.status(500).json({ message: 'Error updating profile image', error: error.message })
   }
})

module.exports = router