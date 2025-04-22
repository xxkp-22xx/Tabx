import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import User     from './models/User.js';
import Group    from './models/Group.js';
import Expense  from './models/Expense.js';
import Debt     from './models/Debt.js';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:   true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// --- User routes ---
// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});
// Register user
app.post('/api/users', async (req, res) => {
  const { address, username } = req.body;
  const user = new User({ address, username });
  await user.save();
  res.status(201).json(user);
});

// --- Group routes ---
// Get all groups
app.get('/api/groups', async (req, res) => {
  const groups = await Group.find();
  res.json(groups);
});
// Create group
app.post('/api/groups', async (req, res) => {
  const { groupId, name, owner } = req.body;
  const group = new Group({ groupId, name, owner, members: [owner] });
  await group.save();
  res.status(201).json(group);
});
// Add member
app.patch('/api/groups/:id/members', async (req, res) => {
  const { member } = req.body;
  const group = await Group.findOne({ groupId: req.params.id });
  group.members.push(member);
  await group.save();
  res.json(group);
});
// Remove member
app.patch('/api/groups/:id/members/remove', async (req, res) => {
  const { member } = req.body;
  const group = await Group.findOne({ groupId: req.params.id });
  group.members = group.members.filter(m => m !== member);
  await group.save();
  res.json(group);
});
// Delete group
app.delete('/api/groups/:id', async (req, res) => {
  await Group.deleteOne({ groupId: req.params.id });
  res.sendStatus(204);
});

// --- Expense routes ---
// Get expenses by group
app.get('/api/expenses/:groupId', async (req, res) => {
  const expenses = await Expense.find({ groupId: req.params.groupId });
  res.json(expenses);
});
// Create expense
app.post('/api/expenses', async (req, res) => {
  const exp = new Expense(req.body);
  await exp.save();
  res.status(201).json(exp);
});

// --- Debt routes ---
// Get debts by group
app.get('/api/debts/:groupId', async (req, res) => {
  const debts = await Debt.find({ groupId: req.params.groupId });
  res.json(debts);
});
// Create debts (bulk)
app.post('/api/debts', async (req, res) => {
  const docs = await Debt.insertMany(req.body);
  res.status(201).json(docs);
});
// Patch a debt
app.patch('/api/debts/:id', async (req, res) => {
  const debt = await Debt.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(debt);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
