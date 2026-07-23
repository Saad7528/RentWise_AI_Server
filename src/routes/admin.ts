import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { SystemSetting } from '../models/SystemSetting';
import { User } from '../models/User';
import { Property } from '../models/Property';

const router = Router();

// Protect all admin endpoints
router.use(authenticate);
router.use(authorizeAdmin);

// 1. Get system settings (auto-approval)
router.get('/settings', async (req: Request, res: Response) => {
  try {
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({ autoApproveListings: false });
    }
    res.json({ setting });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// 2. Update system settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { autoApproveListings } = req.body;
    if (autoApproveListings === undefined) {
      return res.status(400).json({ message: 'autoApproveListings parameter is required' });
    }

    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = new SystemSetting();
    }
    setting.autoApproveListings = autoApproveListings === true || autoApproveListings === 'true';
    await setting.save();

    res.json({ message: 'Settings updated successfully', setting });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// 3. List all users (admin oversight)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// 4. Block/Unblock user
router.patch('/users/:id/block', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect blocking self
    if (user._id.toString() === req.user?._id.toString()) {
      return res.status(400).json({ message: 'You cannot block your own account' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
      user,
    });
  } catch (error) {
    console.error('Error toggling block state:', error);
    res.status(500).json({ message: 'Failed to block/unblock user' });
  }
});

// 5. Delete User Account
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user._id.toString() === req.user?._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// 6. List all properties (all statuses) for moderation
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json({ properties });
  } catch (error) {
    console.error('Error listing properties for moderation:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// 7. Get dashboard analytics data
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProperties = await Property.countDocuments();
    const pendingProperties = await Property.countDocuments({ status: 'PENDING' });
    const approvedProperties = await Property.countDocuments({ status: 'APPROVED' });
    const rentedProperties = await Property.countDocuments({ status: 'RENTED' });

    // Category Distribution for Recharts Pie Chart
    const categories = ['Family', 'Bachelor Allowed', 'Sublet', 'Hostel', 'Commercial Office'];
    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const count = await Property.countDocuments({ category: cat });
        return { name: cat, value: count };
      })
    );

    // Simulated/Aggregated monthly listings for Recharts Area/Bar Chart
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const monthNum = d.getMonth();

      const start = new Date(year, monthNum, 1);
      const end = new Date(year, monthNum + 1, 0, 23, 59, 59);

      const count = await Property.countDocuments({
        createdAt: { $gte: start, $lte: end },
      });

      last6Months.push({
        month: monthName,
        listings: count,
        // Mock a reasonable progression of user logins/activities to display multiple series
        activity: Math.floor(count * 3.5 + Math.random() * 10),
      });
    }

    res.json({
      summary: {
        totalUsers,
        totalProperties,
        pendingProperties,
        approvedProperties,
        rentedProperties,
      },
      categoryStats,
      monthlyStats: last6Months,
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ message: 'Failed to load analytics data' });
  }
});

export default router;
