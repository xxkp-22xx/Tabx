import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  expenseId: { type: Number, required: true, unique: true },
  groupId: { type: Number, required: true },
  totalWei: { type: String, required: true },
  payer: { type: String, required: true },
  participants: { type: [String], required: true },
  shares: { type: Map, of: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Expense", ExpenseSchema);
