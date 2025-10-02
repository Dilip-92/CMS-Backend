import express from 'express'
import Case from '../models/Case.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

// Get all cases with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      caseType 
    } = req.query

    const query = {}
    
    if (search) {
      query.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } }
      ]
    }
    
    if (status && status !== 'all') {
      query.status = status
    }
    
    if (caseType) {
      query.caseType = caseType
    }

    const cases = await Case.find(query)
      .populate('assignedTo', 'name mobile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Case.countDocuments(query)

    res.json({
      success: true,
      cases,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    console.error('Get cases error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cases' 
    })
  }
})

// Get single case
router.get('/:id', auth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id)
      .populate('assignedTo', 'name mobile')
      .populate('notes.createdBy', 'name')

    if (!caseItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      })
    }

    res.json({
      success: true,
      case: caseItem
    })
  } catch (error) {
    console.error('Get case error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch case' 
    })
  }
})

// Create new case
router.post('/', auth, async (req, res) => {
  try {
    const caseData = req.body
    
    // Generate case number (you might want a more sophisticated system)
    const caseCount = await Case.countDocuments()
    caseData.caseNumber = `CR/${String(caseCount + 1).padStart(4, '0')}/${new Date().getFullYear()}`

    const newCase = new Case(caseData)
    await newCase.save()

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      case: newCase
    })
  } catch (error) {
    console.error('Create case error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create case' 
    })
  }
})

// Update case
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedCase = await Case.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name mobile')

    if (!updatedCase) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      })
    }

    res.json({
      success: true,
      message: 'Case updated successfully',
      case: updatedCase
    })
  } catch (error) {
    console.error('Update case error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update case' 
    })
  }
})

// Add hearing to case
router.post('/:id/hearings', auth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id)
    if (!caseItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      })
    }

    caseItem.hearings.push(req.body)
    await caseItem.save()

    res.json({
      success: true,
      message: 'Hearing added successfully',
      case: caseItem
    })
  } catch (error) {
    console.error('Add hearing error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add hearing' 
    })
  }
})

// Add note to case
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id)
    if (!caseItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      })
    }

    caseItem.notes.push({
      ...req.body,
      createdBy: req.user.userId
    })
    await caseItem.save()

    res.json({
      success: true,
      message: 'Note added successfully',
      case: caseItem
    })
  } catch (error) {
    console.error('Add note error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add note' 
    })
  }
})

export default router
