  import mongoose from 'mongoose'

const hearingSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  court: {
    type: String,
    required: true
  },
  judge: String,
  purpose: String,
  notes: String,
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'adjourned', 'cancelled'],
    default: 'scheduled'
  }
})

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pleading', 'affidavit', 'evidence', 'order', 'misc'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
})

const caseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  client: {
    name: {
      type: String,
      required: true
    },
    contact: String,
    email: String,
    address: String
  },
  opposingParty: {
    name: String,
    advocate: String,
    contact: String
  },
  court: {
    type: String,
    required: true
  },
  judge: String,
  caseType: {
    type: String,
    enum: ['criminal', 'civil', 'family', 'commercial', 'writ', 'other'],
    required: true
  },
  filingDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'closed', 'dismissed'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hearings: [hearingSchema],
  documents: [documentSchema],
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
})

// Index for better search performance
caseSchema.index({ caseNumber: 'text', title: 'text', 'client.name': 'text' })

export default mongoose.model('Case', caseSchema)
