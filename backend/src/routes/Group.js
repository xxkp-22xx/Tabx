import express from 'express';
import Group from '../models/Group.js';

const router = express.Router();



router.put('/:groupId/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { memberAddress } = req.body;

await Group.findOneAndUpdate(
  { groupId },
  { $addToSet: { members: memberAddress } },
  { new: true }
);


    if (!updatedGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(updatedGroup);
  } catch (err) {
    console.error('Error in /add-member:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
