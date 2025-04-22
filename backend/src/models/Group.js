import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  groupId:  { type: Number, required: true, unique: true },
  name:     { type: String, required: true },
  owner:    { type: String, required: true },
  members:  { type: [String], default: [] }
});

export default mongoose.model('Group', GroupSchema);
