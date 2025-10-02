import express from 'express'
import { User } from '../models/User.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-pin')
    res.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    })
  }
})

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      req.body,
      { new: true }
    ).select('-pin')

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile' 
    })
  }
})

// Change PIN
router.put('/change-pin', auth, async (req, res) => {
  try {
    const { currentPIN, newPIN } = req.body

    const user = await User.findById(req.user.userId)
    const isCurrentPINValid = await user.comparePIN(currentPIN)

    if (!isCurrentPINValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current PIN is incorrect' 
      })
    }

    user.pin = newPIN
    await user.save()

    res.json({
      success: true,
      message: 'PIN changed successfully'
    })
  } catch (error) {
    console.error('Change PIN error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change PIN' 
    })
  }
})

export default router
