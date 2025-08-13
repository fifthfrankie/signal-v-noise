// Signal vs Noise To-Do — minimal, dependency-free
// Data model
// task: { id: string, text: string, list: 'signal'|'noise', done: boolean, createdAt: number, updatedAt: number }

const STORAGE_KEY = 'svns-tasks-v1';
const STORAGE_ARCHIVE_KEY = 'svns-archive-v1';
const SIGNAL_LIMIT_DEFAULT = 5;

const els = {
  today: document.getElementById('today'),
  themeToggle: document.getElementById('themeToggle'),
  input: document.getElementById('taskInput'),
  addSignal: document.getElementById('addSignalBtn'),
  addNoise: document.getElementById('addNoiseBtn'),
  signalList: document.getElementById('signalList'),
  noiseList: document.getElementById('noiseList'),
  template: document.getElementById('taskItemTemplate'),
  emptySignal: document.getElementById('emptySignal'),
  emptyNoise: document.getElementById('emptyNoise'),
  toasts: document.getElementById('toasts'),
};

let state = {
  tasks: loadTasks(),
  signalLimit: SIGNAL_LIMIT_DEFAULT,
};

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const tasks = JSON.parse(raw);
    return Array.isArray(tasks) ? tasks : [];
  } catch (e) {
    console.error('Failed to load tasks', e);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function archiveCompleted() {
  const completed = state.tasks.filter(t => t.done);
  if (completed.length === 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_ARCHIVE_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = prev.concat({ date: new Date().toISOString(), items: completed });
    localStorage.setItem(STORAGE_ARCHIVE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to archive', e);
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function addTask(text, list) {
  if (!text.trim()) return;
  const isSignal = list === 'signal';
  if (isSignal && countList('signal') >= state.signalLimit) {
    toast(`Signal capped at ${state.signalLimit}. Finish or move something first.`);
    return;
  }
  const now = Date.now();
  state.tasks.push({ id: uid(), text: text.trim(), list, done: false, createdAt: now, updatedAt: now });
  saveTasks();
  render();
  toast(`Added to ${list === 'signal' ? 'Signal' : 'Noise'}`);
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function updateTask(id, patch) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  Object.assign(t, patch, { updatedAt: Date.now() });
  saveTasks();
  render();
}

function moveTask(id, list) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (list === 'signal' && t.list !== 'signal' && countList('signal') >= state.signalLimit) {
  toast(`Signal capped at ${state.signalLimit}. Finish or move something first.`);
    return;
  }
  updateTask(id, { list });
}

function countList(list) {
  return state.tasks.filter(t => t.list === list && !t.done).length;
}

function counts() {
  return {
    signal: state.tasks.filter(t => t.list === 'signal' && !t.done).length,
    noise: state.tasks.filter(t => t.list === 'noise' && !t.done).length,
    done: state.tasks.filter(t => t.done).length,
  };
}

function humanDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function render() {
  els.today.textContent = humanDate();

  // Clear lists
  els.signalList.innerHTML = '';
  els.noiseList.innerHTML = '';

  const hideDone = false;
  const fragmentSignal = document.createDocumentFragment();
  const fragmentNoise = document.createDocumentFragment();

  for (const t of state.tasks) {
    if (hideDone && t.done) continue;
    const node = renderTaskItem(t);
    (t.list === 'signal' ? fragmentSignal : fragmentNoise).appendChild(node);
  }

  els.signalList.appendChild(fragmentSignal);
  els.noiseList.appendChild(fragmentNoise);

  const c = counts();
  if (els.emptySignal) {
    const hasAnySignal = state.tasks.some(t => t.list === 'signal');
    toggleHidden(els.emptySignal, hasAnySignal);
  }
  if (els.emptyNoise) {
    const hasAnyNoise = state.tasks.some(t => t.list === 'noise');
    toggleHidden(els.emptyNoise, hasAnyNoise);
  }
}

function renderTaskItem(t) {
  const li = els.template.content.firstElementChild.cloneNode(true);
  li.dataset.id = t.id;
  if (t.done) li.classList.add('done');

  const checkbox = li.querySelector('input.done');
  const textSpan = li.querySelector('.text');
  const editBtn = li.querySelector('.edit');
  const deleteBtn = li.querySelector('.delete');

  textSpan.textContent = t.text;
  checkbox.checked = t.done;

  checkbox.addEventListener('change', () => {
    updateTask(t.id, { done: checkbox.checked });
  });

  editBtn.addEventListener('click', () => {
    inlineEdit(textSpan, t);
  });
  // dblclick to edit as well
  textSpan.addEventListener('dblclick', () => inlineEdit(textSpan, t));

  deleteBtn.addEventListener('click', () => {
    if (confirm('Delete this task?')) deleteTask(t.id);
  });

  // Drag & Drop
  li.addEventListener('dragstart', (e) => {
    li.classList.add('dragging');
    e.dataTransfer.setData('text/plain', t.id);
  });
  li.addEventListener('dragend', () => li.classList.remove('dragging'));

  return li;
}

function setupDnD(listEl) {
  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    listEl.classList.add('drag-over');
    const after = getDragAfterElement(listEl, e.clientY);
    const dragging = document.querySelector('.task.dragging');
    if (!dragging) return;
    if (after == null) {
      listEl.appendChild(dragging);
    } else {
      listEl.insertBefore(dragging, after);
    }
  });
  listEl.addEventListener('dragleave', () => listEl.classList.remove('drag-over'));
  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    listEl.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const list = listEl.dataset.list;
    moveTask(id, list);
    // reorder in state based on DOM order
    const orderIds = Array.from(listEl.querySelectorAll('.task')).map(li => li.dataset.id);
    reorderWithinList(list, orderIds);
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.task:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderWithinList(list, orderedIds) {
  const within = state.tasks.filter(t => t.list === list);
  const others = state.tasks.filter(t => t.list !== list);
  const map = new Map(within.map(t => [t.id, t]));
  const reordered = orderedIds.map(id => map.get(id)).filter(Boolean);
  const leftovers = within.filter(t => !orderedIds.includes(t.id));
  state.tasks = others.concat(reordered).concat(leftovers);
  saveTasks();
}

function inlineEdit(textSpan, t) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = t.text;
  input.className = 'inline-edit';
  textSpan.replaceWith(input);
  input.focus();
  input.select();
  const commit = () => {
    const val = input.value.trim();
    if (val && val !== t.text) updateTask(t.id, { text: val }); else render();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') render();
  });
}

function toast(msg) {
  if (!els.toasts) return;
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  els.toasts.appendChild(div);
  setTimeout(() => { div.remove(); }, 2000);
}

function toggleHidden(el, hidden) {
  el.classList.toggle('hidden', hidden);
}

function copyTodayToClipboard() {
  const signal = state.tasks.filter(t => t.list === 'signal' && !t.done).map(t => `• ${t.text}`).join('\n');
  const noise = state.tasks.filter(t => t.list === 'noise' && !t.done).map(t => `• ${t.text}`).join('\n');
  const done = state.tasks.filter(t => t.done).map(t => `• ${t.text}`).join('\n');
  const text = `Signal vs Noise — ${humanDate()}\n\nSignal:\n${signal || '—'}\n\nNoise:\n${noise || '—'}\n\nCompleted:\n${done || '—'}\n`;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied today\'s plan to clipboard');
  }, () => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); alert('Copied today\'s plan to clipboard'); } catch {}
    ta.remove();
  });
}

function clearAll() {
  if (!confirm('Delete all tasks?')) return;
  state.tasks = [];
  saveTasks();
  render();
}

function newDay() {
  archiveCompleted();
  // Keep incomplete tasks, reset nothing; or optionally move noise to next day unchanged.
  // Here we simply keep everything and just archive done ones.
  render();
}

function init() {
  els.today.textContent = humanDate();
  els.signalLimit.textContent = state.signalLimit;

  // Theme load
  const theme = localStorage.getItem('svns-theme');
  if (theme === 'light') {
    document.documentElement.classList.add('light');
    if (els.themeToggle) els.themeToggle.textContent = '☀️';
  }

  els.addSignal.addEventListener('click', () => {
    addTask(els.input.value, 'signal');
    els.input.value = '';
    els.input.focus();
  });
  els.addNoise.addEventListener('click', () => {
    addTask(els.input.value, 'noise');
    els.input.value = '';
    els.input.focus();
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const preferSignal = countList('signal') < state.signalLimit; 
      addTask(els.input.value, preferSignal ? 'signal' : 'noise');
      els.input.value = '';
    }
  });

  // removed toggle/export/clear/newDay controls for simplified UI
  if (els.themeToggle) els.themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const isLight = root.classList.toggle('light');
    localStorage.setItem('svns-theme', isLight ? 'light' : 'dark');
    els.themeToggle.textContent = isLight ? '☀️' : '🌙';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key.toLowerCase() === 'n') els.input.focus();
    if (e.key.toLowerCase() === 's') addTaskPrompt('signal');
    if (e.key.toLowerCase() === 'x') addTaskPrompt('noise');
  });

  setupDnD(els.signalList);
  setupDnD(els.noiseList);

  render();
}

init();

function addTaskPrompt(list) {
  const val = prompt(`New ${list === 'signal' ? 'Signal' : 'Noise'} task`);
  if (val && val.trim()) addTask(val.trim(), list);
}
