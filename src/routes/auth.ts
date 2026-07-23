import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Get currently logged-in user profile
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Demo login handler (Landlord / Tenant)
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const { role } = req.body; // 'LANDLORD' or 'TENANT' or 'ADMIN'
    
    if (!role || !['LANDLORD', 'TENANT', 'ADMIN'].includes(role.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid demo role selected' });
    }

    const uppercaseRole = role.toUpperCase();
    let email = '';
    let name = '';
    let image = '';
    let finalRole: 'USER' | 'ADMIN' = 'USER';

    if (uppercaseRole === 'ADMIN') {
      email = 'demo.admin@rentwise.com';
      name = 'Demo System Admin';
      image = 'https://api.dicebear.com/7.x/bottts/svg?seed=admin';
      finalRole = 'ADMIN';
    } else if (uppercaseRole === 'LANDLORD') {
      email = 'demo.landlord@rentwise.com';
      name = 'Demo Landlord (Karim Saheb)';
      image = 'https://api.dicebear.com/7.x/avataaars/svg?seed=karim';
      finalRole = 'USER'; // Both landlords and tenants are USER role with resource ownership, or admin can be ADMIN.
    } else {
      email = 'demo.tenant@rentwise.com';
      name = 'Demo Tenant (Rashed)';
      image = 'https://api.dicebear.com/7.x/avataaars/svg?seed=rashed';
      finalRole = 'USER';
    }

    // 1. Find or create the user in the database
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        emailVerified: true,
        image,
        phone: uppercaseRole === 'LANDLORD' ? '01712345678' : '01912345678',
        role: finalRole,
        isBlocked: false,
      });
    }

    // 2. Generate a session token compatible with Better Auth
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    // 3. Create a Session in the database
    await Session.create({
      id: sessionId,
      userId: user.id || user._id.toString(),
      token: sessionToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Mock Agent',
    });

    // 4. Set the Better Auth cookie
    // Cookie parameters matches Better Auth cookie name
    res.cookie('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    res.json({
      message: 'Demo login successful',
      token: sessionToken,
      user: {
        id: user.id || user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Demo Login Error:', error);
    res.status(500).json({ message: 'Failed to process demo login' });
  }
});

// Logout endpoint (clears cookie)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((cookie) => {
          const parts = cookie.split('=');
          return [parts[0].trim(), parts[1] ? parts[1].trim() : ''];
        })
      );
      token = cookies['better-auth.session_token'];
    }

    if (token) {
      await Session.deleteOne({ token });
    }

    res.clearCookie('better-auth.session_token', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Failed to log out' });
  }
});

export default router;
