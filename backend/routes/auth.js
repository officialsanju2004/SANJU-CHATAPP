import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { sendOtpEmail } from '../utils/mailer.js';


const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function generateOtp() {
  // 6-digit numeric OTP, zero-padded (e.g. "042817")
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username is already taken' });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ username: username.toLowerCase(), password, email: normalizedEmail });
    const token = signToken(user._id);

    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Username or email is already taken' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/forgot-password { email } -> emails a 6-digit OTP if that
// email belongs to an account. Always responds with the same generic
// message either way, so callers can't use this to find out which emails
// are registered.
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const genericMessage = 'If an account exists for that email, a reset code has been sent.';

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    user.passwordReset = {
      otpHash: await bcrypt.hash(otp, salt),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };
    await user.save();

    sendOtpEmail(user.email, otp).catch((err) => console.error('sendOtpEmail failed:', err.message));

    res.json({ message: genericMessage });
  } catch (err) {
    res.status(500).json({ message: 'Could not process your request right now' });
  }
});

// POST /api/auth/reset-password { email, otp, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, code and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const valid = await user.compareResetOtp(otp);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.password = newPassword; // pre('save') hook re-hashes it
    user.passwordReset = { otpHash: '', otpExpires: null };
    await user.save();

    res.json({ message: 'Password reset successfully. You can sign in now.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not reset your password right now' });
  }
});

export default router;
