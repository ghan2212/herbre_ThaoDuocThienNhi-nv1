const mongoose = require('mongoose');
 
const contactSchema = new mongoose.Schema({
  name:   { type: String, required: true, trim: true },
  phone:  { type: String, required: true, trim: true },
  email:  { type: String, trim: true, lowercase: true },
  note:   { type: String, trim: true },
  type:   { type: String, enum: ['contact', 'newsletter'], default: 'contact' },
  status: { type: String, enum: ['new', 'called', 'done', 'ignored'], default: 'new' },
  source: { type: String, default: 'website' },
}, { timestamps: true });
 
module.exports = mongoose.model('Contact', contactSchema);
 