import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  groupId: Number,
  name: String,
  owner: String,
  members: [String]
});

const Group = mongoose.model('Group', groupSchema);
export default Group;
