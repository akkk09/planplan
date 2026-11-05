'use strict';

const STORAGE = {
  routine: 'planplan:routine:v1',
  days: 'planplan:days:v1',
  timer: 'planplan:timer:v1'
};

const DEFAULT_BLOCKS = [
  { id: 'sleep', title: 'Sleep / wake up', start: '23:00', end: '06:00', detail: 'Wind down at 23:00 · Wake up at 06:00', category: 'Recovery' },
  { id: 'revise', title: 'Revise', start: '07:00', end: '08:00', detail: 'Review notes and key ideas before the test.', category: 'Revision' },
  { id: 'test', title: '3-hour test', start: '09:00', end: '12:00', detail: 'Treat this like the real exam. Keep distractions away.', category: 'Test' },
  { id: 'analyze', title: 'Analyze test', start: '12:00', end: '13:00', detail: 'Review mistakes, gaps and questions worth revisiting.', category: 'Review' },
  { id: 'weak', title: 'Weak areas', start: '15:00', end: '17:00', detail: 'Target: 1.5 hours per subject. Use this block for your biggest gaps.', category: 'Deep work' },
  { id: 'weak-cont', title: 'Continue weak areas', start: '18:00', end: '19:30', detail: 'Continue the topics that need another pass.', category: 'Deep work' },
  { id: 'allen', title: 'Allen tests', start: '21:30', end: '22:30', detail: 'Work through the assigned Allen test or review set.', category: 'Practice' },
  { id: 'tomorrow', title: 'Plan tomorrow', start: '22:30', end: '23:00', detail: 'Pick the next topics and set a clear target for the day.', category: 'Planning' }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => JSON.parse(JSON.stringify(value));
const safeText = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast('Could not save. Check your browser storage settings.');
  }
}

let blocks = readJSON(STORAGE.routine, DEFAULT_BLOCKS);
if (!Array.isArray(blocks) || !blocks.length) blocks = clone(DEFAULT_BLOCKS);
let dayStore = readJSON(STORAGE.days, {});
let dateKey = getDateKey(new Date());
let dayData = getDayData(dateKey);
let selectedId = blocks[1]?.id ?? blocks[0].id;
let selectedMinutes = 50;
let timer = readJSON(STORAGE.timer, { status: 'idle', endsAt: null, remainingMs: 50 * 60 * 1000, totalMs: 50 * 60 * 1000 });
let toastTimeout;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayData(key) {
  const value = dayStore[key] || { completed: [], notes: {}, tomorrow: '' };
  return {
    completed: Array.isArray(value.completed) ? value.completed : [],
    notes: value.notes && typeof value.notes === 'object' ? value.notes : {},
    tomorrow: typeof value.tomorrow === 'string' ? value.tomorrow : ''
  };
}

function saveDayData() {
  dayStore[dateKey] = dayData;
  writeJSON(STORAGE.days, dayStore);
}

function saveRoutine() {
  writeJSON(STORAGE.routine, blocks);
}

function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatRange(block) {
  return `${formatTime(block.start)} — ${formatTime(block.end)}`;
}

function occurrenceFor(block, now = new Date()) {
  const startMinute = toMinutes(block.start);
  const endMinute = toMinutes(block.end);
  const wraps = endMinute <= startMinute;
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const startAt = new Date(now);
  startAt.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
  const endAt = new Date(now);
  endAt.setHours(Math.floor(endMinute / 60), endMinute % 60, 0, 0);

  if (wraps) {
    if (nowMinute < endMinute) startAt.setDate(startAt.getDate() - 1);
    else endAt.setDate(endAt.getDate() + 1);
  } else if (nowMinute >= endMinute) {
    startAt.setDate(startAt.getDate() + 1);
    endAt.setDate(endAt.getDate() + 1);
  }
  return { startAt, endAt };
}

function getActiveBlock(now = new Date()) {
  return blocks.find((block) => {
    const { startAt, endAt } = occurrenceFor(block, now);
    return now >= startAt && now < endAt;
  }) || null;
}

function getNextBlock(now = new Date()) {
  return blocks
    .map((block) => ({ block, occurrence: occurrenceFor(block, now) }))
    .filter(({ occurrence }) => occurrence.startAt > now)
    .sort((a, b) => a.occurrence.startAt - b.occurrence.startAt)[0]?.block || null;
}


function todayOccurrenceFor(block, now = new Date()) {
  const startMinute = toMinutes(block.start);
  const endMinute = toMinutes(block.end);
  const wraps = endMinute <= startMinute;
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const startAt = new Date(now);
  startAt.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
  const endAt = new Date(now);
  endAt.setHours(Math.floor(endMinute / 60), endMinute % 60, 0, 0);
  if (wraps) {
    if (nowMinute < endMinute) startAt.setDate(startAt.getDate() - 1);
    else endAt.setDate(endAt.getDate() + 1);
  }
  return { startAt, endAt };
}

function getStatus(block, now = new Date()) {
  if (dayData.completed.includes(block.id)) return 'done';
  const { startAt, endAt } = todayOccurrenceFor(block, now);
  if (now >= startAt && now < endAt) return 'current';
  if (startAt > now) return 'upcoming';
  if (now >= endAt) return 'passed';
  return 'upcoming';
}

function durationMinutes(block) {
  let duration = toMinutes(block.end) - toMinutes(block.start);
  if (duration <= 0) duration += 24 * 60;
  return duration;
}

function updateClock() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('#date-label').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', year: 'numeric' }).toUpperCase();
  $('#day-stamp').textContent = now.toLocaleDateString([], { day: '2-digit' });
  $('#month-stamp').textContent = now.toLocaleDateString([], { month: 'long' });

  const nextDateKey = getDateKey(now);
  if (nextDateKey !== dateKey) {
    dateKey = nextDateKey;
    dayData = getDayData(dateKey);
    renderAll();
  } else {
    renderCurrentBlock(now);
    renderSchedule(now);
  }
  updateTimerDisplay();
}

function renderCurrentBlock(now = new Date()) {
  const active = getActiveBlock(now);
  const current = active || getNextBlock(now);
  const isActive = Boolean(active);
  const title = current?.title || 'Open time';
  $('#current-kicker').textContent = isActive ? 'IN PROGRESS' : current ? 'UP NEXT' : 'NO BLOCKS SET';
  $('#current-caption').textContent = isActive ? 'YOU ARE WORKING ON' : current ? 'YOUR NEXT BLOCK' : 'TAKE A BREATH';
  $('#current-title').textContent = title;
  $('#current-detail').textContent = current?.detail || 'You have no upcoming blocks. Enjoy the space.';
  $('#current-time-range').textContent = current ? formatRange(current) : '—';
  $('#current-action').disabled = !current;
  $('#current-action').innerHTML = isActive ? 'Continue focus <span aria-hidden="true">↗</span>' : 'Start focus <span aria-hidden="true">↗</span>';
  $('#current-action').dataset.blockId = current?.id || '';

  const done = dayData.completed.length;
  const total = blocks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $('#progress-text').textContent = `${done} / ${total} done`;
  $('#progress-fill').style.width = `${percent}%`;
  $('#done-percent').innerHTML = `${percent}<span>%</span>`;
  const remaining = Math.max(0, total - done);
  $('#remaining-count').textContent = remaining === 1 ? '1 block to go' : `${remaining} blocks to go`;
  $('#block-count').textContent = `${total} BLOCK${total === 1 ? '' : 'S'}`;
}

function renderSchedule(now = new Date()) {
  const list = $('#schedule-list');
  list.innerHTML = blocks.map((block, index) => {
    const status = getStatus(block, now);
    const selected = block.id === selectedId;
    const statusLabel = status === 'current' ? 'NOW' : status === 'done' ? 'DONE' : status === 'passed' ? 'PASSED' : 'UPCOMING';
    const doneLabel = status === 'done' ? 'Undo' : 'Mark done';
    return `
      <div class="schedule-item ${status === 'current' ? 'is-current' : ''} ${status === 'done' ? 'is-done' : ''} ${selected ? 'is-selected' : ''}" data-id="${safeText(block.id)}">
        <div class="time-column"><span>${safeText(formatTime(block.start))}</span><span class="time-end">${safeText(formatTime(block.end))}</span></div>
        <div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div>
        <article class="block-card">
          <div class="block-meta"><span class="block-category">${safeText(block.category || 'Study')}</span><span class="status-pill">${statusLabel}</span></div>
          <h3>${safeText(block.title)}</h3>
          <p class="block-detail">${safeText(block.detail || 'No extra details added.')}</p>
          <div class="block-actions">
            <button type="button" class="small-button" data-action="select" data-id="${safeText(block.id)}">Focus notes</button>
            <button type="button" class="small-button done-button" data-action="toggle" data-id="${safeText(block.id)}">${doneLabel}</button>
          </div>
        </article>
      </div>`;
  }).join('');
}

function renderSelectedBlock() {
  const block = blocks.find((item) => item.id === selectedId) || blocks[0];
  if (!block) {
    $('#selected-title').textContent = 'No block selected';
    $('#selected-hint').textContent = 'Add a block to your routine to get started.';
    $('#block-note').value = '';
    return;
  }
  selectedId = block.id;
  $('#selected-title').textContent = block.title;
  $('#selected-hint').textContent = block.detail || `Add a note for ${block.title.toLowerCase()}.`;
  $('#block-note').value = dayData.notes[block.id] || '';
}

function renderAll() {
  renderCurrentBlock();
  renderSchedule();
  renderSelectedBlock();
  $('#tomorrow-note').value = dayData.tomorrow || '';
  updateTimerDisplay();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function selectBlock(id, startFocus = false) {
  const block = blocks.find((item) => item.id === id);
  if (!block) return;
  selectedId = id;
  renderSchedule();
  renderSelectedBlock();
  if (startFocus) {
    const now = new Date();
    const occurrence = occurrenceFor(block, now);
    const minutes = getStatus(block, now) === 'current'
      ? Math.max(1, Math.ceil((occurrence.endAt - now) / 60000))
      : durationMinutes(block);
    selectedMinutes = minutes;
    $('#custom-minutes').value = minutes;
    setPresetActive(null);
    startTimer(minutes, block.title);
  }
  if (window.matchMedia('(max-width: 640px)').matches) $('#selected-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function toggleCompleted(id) {
  const index = dayData.completed.indexOf(id);
  if (index >= 0) dayData.completed.splice(index, 1);
  else dayData.completed.push(id);
  saveDayData();
  renderCurrentBlock();
  renderSchedule();
  showToast(index >= 0 ? 'Block moved back to your list.' : 'Block marked done. Nice work.');
}

function setPresetActive(minutes) {
  $$('[data-minutes]').forEach((button) => button.classList.toggle('selected', Number(button.dataset.minutes) === minutes));
}

function startTimer(minutes, label = '') {
  const value = Math.max(1, Math.min(720, Math.floor(Number(minutes) || 50)));
  selectedMinutes = value;
  timer = { status: 'running', endsAt: Date.now() + value * 60 * 1000, remainingMs: value * 60 * 1000, totalMs: value * 60 * 1000, label };
  writeJSON(STORAGE.timer, timer);
  $('#timer-context').textContent = label ? `Focused on ${label}.` : 'A quiet stretch of focused work.';
  renderTimerControls();
  updateTimerDisplay();
}

function pauseTimer() {
  if (timer.status !== 'running') return;
  timer.remainingMs = Math.max(0, timer.endsAt - Date.now());
  timer.status = 'paused';
  timer.endsAt = null;
  writeJSON(STORAGE.timer, timer);
  renderTimerControls();
  updateTimerDisplay();
}

function resetTimer() {
  timer = { status: 'idle', endsAt: null, remainingMs: selectedMinutes * 60 * 1000, totalMs: selectedMinutes * 60 * 1000, label: '' };
  $('#timer-context').textContent = 'A quiet stretch of focused work.';
  writeJSON(STORAGE.timer, timer);
  renderTimerControls();
  updateTimerDisplay();
}

function resumeTimer() {
  const remaining = Math.max(1000, timer.remainingMs || timer.totalMs || 50 * 60 * 1000);
  timer.status = 'running';
  timer.endsAt = Date.now() + remaining;
  writeJSON(STORAGE.timer, timer);
  renderTimerControls();
  updateTimerDisplay();
}

function finishTimer() {
  timer.status = 'idle';
  timer.endsAt = null;
  timer.remainingMs = 0;
  writeJSON(STORAGE.timer, timer);
  renderTimerControls();
  updateTimerDisplay();
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Focus session complete', { body: 'Your timer has finished. Take a short break.' }); } catch { /* Notifications may be blocked by the browser. */ }
  }
  showToast('Focus session complete. Take a breather.');
}

function updateTimerDisplay() {
  let remaining = timer.status === 'running' ? Math.max(0, timer.endsAt - Date.now()) : Math.max(0, timer.remainingMs || 0);
  if (timer.status === 'running' && remaining <= 0) {
    finishTimer();
    return;
  }
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  $('#timer-display').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  if (timer.status === 'running') document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} · planplan`;
  else document.title = 'planplan — daily system';
  const state = timer.status === 'running' ? 'IN SESSION' : timer.status === 'paused' ? 'PAUSED' : timer.remainingMs === 0 ? 'COMPLETE' : 'READY WHEN YOU ARE';
  $('#timer-state').textContent = state;
}

function renderTimerControls() {
  const button = $('#timer-start');
  const isRunning = timer.status === 'running';
  $$('.timer-presets button').forEach((preset) => { preset.disabled = isRunning; });
  $('#custom-minutes').disabled = isRunning;
  if (timer.status === 'running') {
    button.innerHTML = 'Pause timer <span aria-hidden="true">Ⅱ</span>';
    button.dataset.action = 'pause';
  } else if (timer.status === 'paused') {
    button.innerHTML = 'Resume timer <span aria-hidden="true">↗</span>';
    button.dataset.action = 'resume';
  } else {
    button.innerHTML = 'Start timer <span aria-hidden="true">↗</span>';
    button.dataset.action = 'start';
  }
}

function openEditor() {
  renderEditor();
  $('#routine-dialog').showModal();
}

function renderEditor() {
  $('#editor-list').innerHTML = blocks.map((block) => editorRow(block)).join('');
}

function editorRow(block) {
  return `<div class="editor-row" data-id="${safeText(block.id)}">
    <div class="editor-field title-field"><label>BLOCK NAME</label><input data-field="title" aria-label="Block name" value="${safeText(block.title)}" maxlength="48" required /></div>
    <div class="editor-field detail-field"><label>DETAIL / GOAL</label><input data-field="detail" aria-label="Block detail" value="${safeText(block.detail || '')}" maxlength="110" /></div>
    <div class="editor-field"><label>START</label><input data-field="start" type="time" aria-label="Start time" value="${safeText(block.start)}" required /></div>
    <div class="editor-field"><label>END</label><input data-field="end" type="time" aria-label="End time" value="${safeText(block.end)}" required /></div>
    <button type="button" class="remove-block" data-action="remove-editor" aria-label="Remove ${safeText(block.title)}">×</button>
  </div>`;
}

function readEditor() {
  const next = [];
  for (const row of $$('.editor-row', $('#editor-list'))) {
    const id = row.dataset.id;
    const title = $('[data-field="title"]', row).value.trim();
    const start = $('[data-field="start"]', row).value;
    const end = $('[data-field="end"]', row).value;
    const detail = $('[data-field="detail"]', row).value.trim();
    if (!title || !start || !end || start === end) {
      showToast('Add a name and valid start / end times to every block.');
      return null;
    }
    const old = blocks.find((block) => block.id === id);
    next.push({ id, title, start, end, detail, category: old?.category || 'Study' });
  }
  if (!next.length) {
    showToast('Keep at least one block in your routine.');
    return null;
  }
  return next;
}

function closeEditor() {
  $('#routine-dialog').close();
}

function initEvents() {
  $('#schedule-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'select') selectBlock(id);
    if (action === 'toggle') toggleCompleted(id);
  });

  $('#current-action').addEventListener('click', (event) => {
    const id = event.currentTarget.dataset.blockId;
    if (id) selectBlock(id, true);
  });

  $('#edit-routine').addEventListener('click', openEditor);
  $('#close-dialog').addEventListener('click', closeEditor);
  $('#cancel-edit').addEventListener('click', closeEditor);
  $('#add-block').addEventListener('click', () => {
    const id = `block-${Date.now().toString(36)}`;
    $('#editor-list').insertAdjacentHTML('beforeend', editorRow({ id, title: '', start: '08:00', end: '09:00', detail: '', category: 'Study' }));
    const rows = $$('.editor-row', $('#editor-list'));
    $('[data-field="title"]', rows.at(-1))?.focus();
  });
  $('#editor-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="remove-editor"]');
    if (button) button.closest('.editor-row').remove();
  });
  $('#restore-defaults').addEventListener('click', () => {
    if (!window.confirm('Restore the original daily routine? Your saved notes and check-offs will stay.')) return;
    blocks = clone(DEFAULT_BLOCKS);
    renderEditor();
  });
  $('#routine-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const next = readEditor();
    if (!next) return;
    const removedIds = blocks.filter((old) => !next.some((item) => item.id === old.id)).map((item) => item.id);
    blocks = next;
    dayData.completed = dayData.completed.filter((id) => blocks.some((block) => block.id === id));
    removedIds.forEach((id) => delete dayData.notes[id]);
    if (!blocks.some((block) => block.id === selectedId)) selectedId = blocks[0].id;
    saveRoutine();
    saveDayData();
    closeEditor();
    renderAll();
    showToast('Routine updated.');
  });

  $$('.timer-presets button').forEach((button) => button.addEventListener('click', () => {
    selectedMinutes = Number(button.dataset.minutes);
    $('#custom-minutes').value = selectedMinutes;
    setPresetActive(selectedMinutes);
    if (timer.status !== 'running') resetTimer();
  }));
  $('#custom-minutes').addEventListener('input', () => {
    const value = Number($('#custom-minutes').value);
    selectedMinutes = Number.isFinite(value) ? Math.max(1, Math.min(720, Math.floor(value))) : 50;
    setPresetActive([25, 50, 90].includes(selectedMinutes) ? selectedMinutes : null);
    if (timer.status !== 'running') resetTimer();
  });
  $('#timer-start').addEventListener('click', () => {
    if (timer.status === 'running') pauseTimer();
    else if (timer.status === 'paused') resumeTimer();
    else startTimer(selectedMinutes);
  });
  $('#timer-reset').addEventListener('click', resetTimer);

  $('#block-note').addEventListener('input', (event) => {
    if (!selectedId) return;
    dayData.notes[selectedId] = event.target.value;
    saveDayData();
  });
  $('#tomorrow-note').addEventListener('input', (event) => {
    dayData.tomorrow = event.target.value;
    saveDayData();
  });
}

function init() {
  if (timer.status === 'running' && timer.endsAt <= Date.now()) {
    timer.status = 'idle';
    timer.remainingMs = 0;
    timer.endsAt = null;
    writeJSON(STORAGE.timer, timer);
  }
  renderTimerControls();
  initEvents();
  renderAll();
  updateClock();
  setInterval(updateClock, 1000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: new URL('./', document.baseURI).pathname }).catch(() => {}));
  }
}

init();
