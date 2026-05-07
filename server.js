const express = require('express');
const Profile = require('./models/Profile');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const User = require('./models/User');

const app = express();
const JWT_SECRET = 'your_secret_key_change_this'; // change this to something strong

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); // your React app
app.use(express.json());
// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── REGISTER ───────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'Email already registered' });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ─── CREATE / UPDATE PROFILE ─────────────────────────────────
app.post('/api/profile', authenticateToken, async (req, res) => {
  const { name, gender, age, height, weight, targetWeight, dietType } = req.body;

  if (!name || !gender || !age || !height || !weight || !targetWeight || !dietType)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const profile = await Profile.findOneAndUpdate(
      { userId: req.userId },
      { name, gender, age, height, weight, targetWeight, dietType },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Profile saved', profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET PROFILE ─────────────────────────────────────────────
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.userId });
    if (!profile)
      return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ─── START SERVER ────────────────────────────────────────────
app.listen(5000, () => console.log('Server running on http://localhost:5000'));