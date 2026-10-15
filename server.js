const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let categories = [
  { id: 'food', name: 'Food & Dining', icon: '🍕' },
  { id: 'activities', name: 'Activities & Fun', icon: '🎬' },
  { id: 'decisions', name: 'Quick Decisions', icon: '⚡' },
  { id: 'custom', name: 'My Custom List', icon: '✨' }
];

let items = [
  // Food
  { id: '1', categoryId: 'food', name: 'Pizza Night', description: 'Classic pepperoni or custom toppings', isCustom: false },
  { id: '2', categoryId: 'food', name: 'Sushi Bar', description: 'Fresh rolls and nigiri', isCustom: false },
  { id: '3', categoryId: 'food', name: 'Taco Fiesta', description: 'Street tacos and fresh guac', isCustom: false },
  { id: '4', categoryId: 'food', name: 'Burger Joint', description: 'Juicy smash burgers and crispy fries', isCustom: false },
  { id: '5', categoryId: 'food', name: 'Pad Thai', description: 'Flavorful noodles with peanuts and lime', isCustom: false },
  { id: '6', categoryId: 'food', name: 'Italian Pasta', description: 'Creamy carbonara or rich bolognese', isCustom: false },

  // Activities
  { id: '7', categoryId: 'activities', name: 'Watch a Movie', description: 'Pick a movie on your watchlist', isCustom: false },
  { id: '8', categoryId: 'activities', name: 'Go for a Walk', description: 'Explore a local park or neighborhood', isCustom: false },
  { id: '9', categoryId: 'activities', name: 'Board Game Night', description: 'Gather friends or play a solo strategy game', isCustom: false },
  { id: '10', categoryId: 'activities', name: 'Read a Chapter', description: 'DDT - Dedicated Reading Time', isCustom: false },
  { id: '11', categoryId: 'activities', name: 'Try a New Recipe', description: 'Bake or cook something from scratch', isCustom: false },
  { id: '12', categoryId: 'activities', name: 'Listen to a Podcast', description: 'Learn something new or hear comedy', isCustom: false },

  // Quick Decisions
  { id: '13', categoryId: 'decisions', name: 'Yes!', description: 'Go for it without hesitation', isCustom: false },
  { id: '14', categoryId: 'decisions', name: 'No', description: 'Maybe next time', isCustom: false },
  { id: '15', categoryId: 'decisions', name: 'Ask Again Later', description: 'Sleep on it and decide tomorrow', isCustom: false },
  { id: '16', categoryId: 'decisions', name: 'Flip a Coin', description: 'Heads or tails decides', isCustom: false }
];

let spinCount = 0;
let recentHistory = [];

// API Endpoints

// GET /api/categories
app.get('/api/categories', (req, res) => {
  res.json({ categories });
});

// GET /api/decisions
app.get('/api/decisions', (req, res) => {
  const { category } = req.query;
  let filtered = items;
  if (category) {
    filtered = items.filter(item => item.categoryId === category);
  }
  res.json({ items: filtered });
});

// POST /api/decisions
app.post('/api/decisions', (req, res) => {
  const { categoryId, name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const newItem = {
    id: String(Date.now()),
    categoryId: categoryId || 'custom',
    name: name.trim(),
    description: description ? description.trim() : '',
    isCustom: true
  };

  items.push(newItem);
  res.status(201).json({ item: newItem });
});

// DELETE /api/decisions/:id
app.delete('/api/decisions/:id', (req, res) => {
  const { id } = req.params;
  const index = items.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const deletedItem = items.splice(index, 1)[0];
  res.json({ message: 'Item deleted successfully', item: deletedItem });
});

// GET /api/decisions/random
app.get('/api/decisions/random', (req, res) => {
  const { category } = req.query;
  let pool = items;
  if (category) {
    pool = items.filter(item => item.categoryId === category);
  }

  if (pool.length === 0) {
    return res.status(404).json({ error: 'No items available in this category' });
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  spinCount++;

  const historyEntry = {
    id: String(Date.now()),
    item: selected,
    timestamp: new Date().toISOString()
  };

  recentHistory.unshift(historyEntry);
  if (recentHistory.length > 10) {
    recentHistory.pop();
  }

  res.json({ selected, spinCount });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalItems: items.length,
    totalSpinCount: spinCount,
    recentHistory
  });
});

// Export app or listen if directly executed
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Randomizer Hub server running on port ${PORT}`);
  });
}

module.exports = app;
