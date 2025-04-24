import mongoose from 'mongoose';

const DebtSchema = new mongoose.Schema({
  groupId:   Number,
  debtor:    String,
  creditor:  String,
  amountWei: String,   // always stored as string
  settled:   { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Debt', DebtSchema);
