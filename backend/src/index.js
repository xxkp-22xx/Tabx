import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import User from "./models/User.js";
import Group from "./models/Group.js";
import Expense from "./models/Expense.js";
import Debt from "./models/Debt.js";
import Counter from "./models/Counter.js";

import groupRoutes from "./routes/Group.js";
import BN from "bn.js";

const app = express();
app.use(cors());

app.use("/api/groups", groupRoutes);

app.use(express.json());

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// --- User routes ---
// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});
// Register user
app.post("/api/users", async (req, res) => {
  const { address, username } = req.body;
  const user = new User({ address, username });
  await user.save();
  res.status(201).json(user);
});

// --- Group routes ---
// Get all groups
app.get("/api/groups", async (req, res) => {
  const groups = await Group.find();
  res.json(groups);
});
// Create group
app.post("/api/groups", async (req, res) => {
  const { groupId, name, owner } = req.body;
  const group = new Group({ groupId, name, owner, members: [owner] });
  await group.save();
  res.status(201).json(group);
});
// Add member
app.patch("/api/groups/:id/members", async (req, res) => {
  const { member } = req.body;
  const group = await Group.findOne({ groupId: req.params.id });
  group.members.push(member);
  await group.save();
  res.json(group);
});
// Remove member
app.patch("/api/groups/:id/members/remove", async (req, res) => {
  const { member } = req.body;
  const group = await Group.findOne({ groupId: req.params.id });
  group.members = group.members.filter((m) => m !== member);
  await group.save();
  res.json(group);
});
// Delete group
app.delete("/api/groups/:id", async (req, res) => {
  await Group.deleteOne({ groupId: req.params.id });
  res.sendStatus(204);
});

// --- Expense routes ---
// Get expenses by group
app.get("/api/expenses/:groupId", async (req, res) => {
  const expenses = await Expense.find({ groupId: req.params.groupId });
  res.json(expenses);
});
// Create expense
app.post("/api/expenses", async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: "expenseId" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    const expenseId = counter.value;

    const expense = new Expense({
      expenseId,
      ...req.body,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error("Error creating expense:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Debt routes ---
// Get debts by group
app.get("/api/debts/:groupId", async (req, res) => {
  const debts = await Debt.find({ groupId: req.params.groupId });
  res.json(debts);
});
app.get('/api/debts', async (req, res) => {
  const { groupId, debtor } = req.query;
  const filter = {};
  if (groupId) filter.groupId = Number(groupId);
  if (debtor)  filter.debtor  = debtor;
  try {
    const debts = await Debt.find(filter).lean();
    res.json(debts);
  } catch (err) {
    console.error("Failed to fetch debts:", err);
    res.status(500).json({ error: err.message });
  }
});
// Create debts (bulk)
app.post("/api/debts", async (req, res) => {
  const docs = await Debt.insertMany(req.body);
  res.status(201).json(docs);
});
// Patch a debt
app.patch("/api/debts/:id", async (req, res) => {
  const debt = await Debt.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(debt);
});

app.put("/api/settle", async (req, res) => {
  const { groupId, debtor, creditor, amountWei } = req.body;

  if (!groupId || !debtor || !creditor || !amountWei) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const debt = await Debt.findOne({
      groupId,
      debtor,
      creditor,
      settled: false
    });

    if (!debt) {
      return res.status(404).json({ error: "Debt not found or already settled" });
    }

    const current = new BN(debt.amountWei);
    const payment = new BN(amountWei);

// Clamp payment to available debt
const safePayment = payment.gt(current) ? current : payment;
const remaining = current.sub(safePayment);


    // const remaining = current.sub(payment);
    debt.amountWei = remaining.toString();
    debt.settled = remaining.isZero();
    debt.timestamp = new Date();

    await debt.save();
    res.json({ message: "Debt updated", debt });

  } catch (err) {
    console.error("Debt update error:", err);
    res.status(500).json({ error: err.message });
  }
});


mongoose
  .connect(
    "mongodb+srv://khwaeeshpatel07:zFXnWzi63llICAUD@cluster0.7zgrqoj.mongodb.net/tabx?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("✅ MongoDB connected correctly"))
  .catch((err) => console.error("🚨 MongoDB connection error:", err));

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB Atlas");
  console.log("Database name:", mongoose.connection.name); // Shows exact DB you're connected to
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
