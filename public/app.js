document.addEventListener('DOMContentLoaded', () => {
  // State
  let categories = [];
  let currentCategory = 'food';
  let currentItems = [];
  let isSpinning = false;

  // DOM Elements
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  const categoryTabs = document.getElementById('categoryTabs');
  const currentCategoryTitle = document.getElementById('currentCategoryTitle');
  const itemCountBadge = document.getElementById('itemCountBadge');
  const spinnerDisplay = document.getElementById('spinnerDisplay');
  const spinBtn = document.getElementById('spinBtn');
  const resultBox = document.getElementById('resultBox');
  const resultTitle = document.getElementById('resultTitle');
  const resultDesc = document.getElementById('resultDesc');
  const addOptionForm = document.getElementById('addOptionForm');
  const optionNameInput = document.getElementById('optionName');
  const optionDescInput = document.getElementById('optionDesc');
  const optionsList = document.getElementById('optionsList');
  const statTotalItems = document.getElementById('statTotalItems');
  const statTotalSpins = document.getElementById('statTotalSpins');
  const historyList = document.getElementById('historyList');

  // Theme Management
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });

  // Initialization
  init();

  async function init() {
    await loadCategories();
    await loadItems(currentCategory);
    await loadStats();
  }

  // Fetch Categories
  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      categories = data.categories || [];
      renderCategories();
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function renderCategories() {
    categoryTabs.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-tab ${cat.id === currentCategory ? 'active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', cat.id === currentCategory ? 'true' : 'false');
      btn.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
      btn.addEventListener('click', () => selectCategory(cat.id, cat.name));
      categoryTabs.appendChild(btn);
    });
  }

  async function selectCategory(catId, catName) {
    if (isSpinning) return;
    currentCategory = catId;
    renderCategories();
    currentCategoryTitle.textContent = catName || 'Options';
    resultBox.classList.add('hidden');
    resetSpinnerDisplay();
    await loadItems(currentCategory);
  }

  function resetSpinnerDisplay() {
    spinnerDisplay.innerHTML = `
      <div class="spinner-placeholder">
        <span class="placeholder-icon">✨</span>
        <p>Ready to Spin!</p>
      </div>
    `;
  }

  // Fetch Items for Current Category
  async function loadItems(catId) {
    try {
      const res = await fetch(`/api/decisions?category=${catId}`);
      const data = await res.json();
      currentItems = data.items || [];
      itemCountBadge.textContent = `${currentItems.length} option${currentItems.length === 1 ? '' : 's'}`;
      renderItems();
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  }

  function renderItems() {
    optionsList.innerHTML = '';
    if (currentItems.length === 0) {
      optionsList.innerHTML = `<li class="empty-history">No options in this category yet. Add one above!</li>`;
      return;
    }

    currentItems.forEach(item => {
      const li = document.createElement('li');
      li.className = 'option-item';
      li.innerHTML = `
        <div class="option-info">
          <span class="option-name">${escapeHTML(item.name)}</span>
          ${item.description ? `<span class="option-desc">${escapeHTML(item.description)}</span>` : ''}
        </div>
        ${item.isCustom ? `<button class="btn-delete" data-id="${item.id}" aria-label="Delete option">&times;</button>` : ''}
      `;

      if (item.isCustom) {
        const deleteBtn = li.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => deleteItem(item.id));
      }

      optionsList.appendChild(li);
    });
  }

  // Add Custom Item
  addOptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = optionNameInput.value.trim();
    const description = optionDescInput.value.trim();

    if (!name) return;

    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: currentCategory, name, description })
      });

      if (res.ok) {
        optionNameInput.value = '';
        optionDescInput.value = '';
        await loadItems(currentCategory);
        await loadStats();
      }
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  });

  // Delete Custom Item
  async function deleteItem(id) {
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadItems(currentCategory);
        await loadStats();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  // Spin Randomizer
  spinBtn.addEventListener('click', async () => {
    if (isSpinning) return;
    if (currentItems.length === 0) {
      alert('Please add at least one option before spinning!');
      return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.innerHTML = `<span>⏳</span> Selecting...`;
    resultBox.classList.add('hidden');

    // Fetch random item from server
    try {
      const res = await fetch(`/api/decisions/random?category=${currentCategory}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to make a selection');
        isSpinning = false;
        spinBtn.disabled = false;
        spinBtn.innerHTML = `<span class="btn-icon">🎲</span> Spin the Wheel!`;
        return;
      }

      const selected = data.selected;

      // Animate selection cycle locally
      let counter = 0;
      const totalCycles = 20;
      const interval = setInterval(() => {
        const randomTemp = currentItems[Math.floor(Math.random() * currentItems.length)];
        spinnerDisplay.innerHTML = `<div class="spinning-item">${escapeHTML(randomTemp.name)}</div>`;
        counter++;

        if (counter >= totalCycles) {
          clearInterval(interval);
          finishSpin(selected);
        }
      }, 70);

    } catch (err) {
      console.error('Spin error:', err);
      isSpinning = false;
      spinBtn.disabled = false;
      spinBtn.innerHTML = `<span class="btn-icon">🎲</span> Spin the Wheel!`;
    }
  });

  function finishSpin(selected) {
    spinnerDisplay.innerHTML = `<div class="spinning-item" style="color: var(--accent-color); font-size: 1.8rem;">🎉 ${escapeHTML(selected.name)}</div>`;
    resultTitle.textContent = selected.name;
    resultDesc.textContent = selected.description || 'Destiny has spoken!';
    resultBox.classList.remove('hidden');

    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.innerHTML = `<span class="btn-icon">🎲</span> Spin Again!`;

    loadStats();
  }

  // Fetch Stats & Activity Log
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();

      statTotalItems.textContent = data.totalItems || 0;
      statTotalSpins.textContent = data.totalSpinCount || 0;

      renderHistory(data.recentHistory || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function renderHistory(history) {
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyList.innerHTML = `<li class="empty-history">No decisions logged yet. Give it a spin!</li>`;
      return;
    }

    history.forEach(entry => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <span class="history-name">${escapeHTML(entry.item.name)}</span>
        <span class="history-time">${timeStr}</span>
      `;
      historyList.appendChild(li);
    });
  }

  // Helper Utility
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
});
