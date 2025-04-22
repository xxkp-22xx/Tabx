import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  address:  { type: String, required: true, unique: true },
  username: { type: String, required: true }
});

export default mongoose.model('User', UserSchema);
