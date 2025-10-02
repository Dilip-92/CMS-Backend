import express from 'express'
import jwt from 'jsonwebtoken'
import { User, OTP } from '../models/User.js'

const router = express.Router()

// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP (Mock implementation - integrate with SMS service like Twilio)
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid 10-digit mobile number required' 
      })
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save OTP to database
    await OTP.findOneAndUpdate(
      { mobile },
      { mobile, otp, expiresAt },
      { upsert: true, new: true }
    )

    // In production, integrate with SMS service like Twilio
    console.log(`OTP for ${mobile}: ${otp}`) // Remove this in production

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // Remove otp in production, only for development
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP' 
    })
  }
})

// Verify OTP and return temp token
router.post('/login', async (req, res) => {
  try {
    const { mobile, otp } = req.body

    if (!mobile || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile and OTP are required' 
      })
    }

    // Find and verify OTP
    const otpRecord = await OTP.findOne({ mobile })
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      })
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ mobile })
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      })
    }

    // Check if user exists
    let user = await User.findOne({ mobile })
    if (!user) {
      // Create new user if doesn't exist (first time login)
      user = new User({
        name: `User_${mobile}`,
        mobile,
        pin: '0000' // Default PIN, user should change it
      })
      await user.save()
    }

    // Generate temporary token (valid for OTP verification step only)
    const tempToken = jwt.sign(
      { 
        userId: user._id, 
        mobile: user.mobile,
        purpose: 'otp_verification' 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    )

    // Delete used OTP
    await OTP.deleteOne({ mobile })

    res.json({
      success: true,
      message: 'OTP verified successfully',
      tempToken,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role
      }
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'OTP verification failed' 
    })
  }
})

// PIN login
router.post('/pin-login', async (req, res) => {
  try {
    const { pin } = req.body

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid 4-digit PIN required' 
      })
    }

    // In a real app, you'd get user from temp token or session
    // For demo, we'll use a default user
    const user = await User.findOne({ mobile: 'default' })
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    // Verify PIN
    const isPINValid = await user.comparePIN(pin)
    if (!isPINValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid PIN' 
      })
    }

    // Generate final auth token
    const token = jwt.sign(
      { 
        userId: user._id, 
        mobile: user.mobile,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role
      }
    })
  } catch (error) {
    console.error('PIN login error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'PIN login failed' 
    })
  }
})

export default router
