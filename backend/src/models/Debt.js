import mongoose from 'mongoose';

const DebtSchema = new mongoose.Schema({
  groupId:    { type: Number, required: true },
  debtor:     { type: String, required: true },
  creditor:   { type: String, required: true },
  amountWei:  { type: String, required: true },
  settled:    { type: Boolean, default: false },
  timestamp:  { type: Date, default: Date.now }
});

export default mongoose.model('Debt', DebtSchema);
