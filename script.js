/* =========================================================
   Better Me - Pure Client-Side Journal Engine
   Includes: 6 Visual Themes, Multi-tone Loud Alarm & Week Sync
   ========================================================= */

let activeDate = new Date();
const FA_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function getDefaultTimePhases() {
  return [
    { id: 'ph_1', start: '11:30', end: '16:00', title: 'Afternoon', done: false, reminder: true },
    { id: 'ph_2', start: '16:00', end: '22:30', title: 'Evening', done: false, reminder: true }
  ];
}

function getInitialStore() {
  return {
    waterCups: 0,
    activeMood: '',
    ratingValues: {},
    timePhases: getDefaultTimePhases(),
    tasksList: [
      { id: 'tk_1', title: 'Math', time: '16:00', reminder: true, done: false }
    ],
    shoppingList: [
      { id: 'sh_1', title: 'خرید مواد غذایی', done: false }
    ],
    habitTracker: [
      { name: 'ورزش', days: [false, false, false, false, false, false, false] },
      { name: 'مطالعه', days: [false, false, false, false, false, false, false] }
    ],
    inputsData: {}
  };
}

let storeKey = '';
let currentPlannerState = getInitialStore();

// ==========================================
// ساعت زنده و همگام‌سازی خودکار نیمه‌شب
// ==========================================
let lastDateMark = new Date().toDateString();

function updateLiveClock() {
  const clockEl = document.getElementById('liveClockText');
  if (!clockEl) return;
  const now = new Date();

  if (now.toDateString() !== lastDateMark) {
    lastDateMark = now.toDateString();
    activeDate = new Date();
    refreshDateAndUI();
  }

  clockEl.textContent = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// ==========================================
// ناوبری هفته جاری (شنبه تا جمعه)
// ==========================================
function getPersianWeekdayIndex(dateObj) {
  return (dateObj.getDay() + 1) % 7;
}

function getSaturdayOfCurrentWeek(dateObj) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  d.setDate(d.getDate() - getPersianWeekdayIndex(d));
  return d;
}

function updateWeekStripUI() {
  const saturdayDate = getSaturdayOfCurrentWeek(activeDate);
  const currentActiveIdx = getPersianWeekdayIndex(activeDate);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(saturdayDate);
    dayDate.setDate(saturdayDate.getDate() + i);

    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      month: '2-digit', day: '2-digit'
    }).format(dayDate).split('/');

    const labelDateEl = document.getElementById(`wdate_${i}`);
    if (labelDateEl) {
      labelDateEl.textContent = parts.length === 2 ? `${parts[0]}/${parts[1]}` : parts.join('/');
    }

    const chipEl = document.querySelector(`.day-chip[data-day-index="${i}"]`);
    if (chipEl) {
      chipEl.classList.toggle('active', i === currentActiveIdx);
    }
  }
}

document.querySelectorAll('.day-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const targetIdx = parseInt(chip.getAttribute('data-day-index'));
    const saturdayDate = getSaturdayOfCurrentWeek(activeDate);
    const targetDate = new Date(saturdayDate);
    targetDate.setDate(saturdayDate.getDate() + targetIdx);

    activeDate = targetDate;
    refreshDateAndUI();
  });
});

document.getElementById('btnJumpToToday').addEventListener('click', () => {
  activeDate = new Date();
  refreshDateAndUI();
});

function formatShamsiDate(d) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}

function getShamsiDayOfWeek(d) {
  return FA_WEEKDAYS[getPersianWeekdayIndex(d)];
}

function refreshDateAndUI() {
  const formattedStr = formatShamsiDate(activeDate);
  document.getElementById('currentDateDisplay').value = formattedStr;
  document.getElementById('currentDayNameDisplay').textContent = getShamsiDayOfWeek(activeDate);

  updateWeekStripUI();

  storeKey = `better_me_planner_data_${formattedStr.replace(/\//g, '_')}`;
  readStorageData();
  drawCalendar();
}

// ==========================================
// سیستم صوتی و آلارم بلند و واضح چندتنی (Web Audio API)
// ==========================================
let audioCtx = null;
let alarmInterval = null;

function unlockAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
window.addEventListener('touchstart', unlockAudio, { once: true });
window.addEventListener('click', unlockAudio, { once: true });

function playLoudAlarmMelody() {
  unlockAudio();
  if (!audioCtx) return;

  // الگوی چندتنی و مشخص (ترکیب فرکانس‌های بالا برای شنیده شدن عالی)
  const notes = [659.25, 783.99, 987.77, 1318.51, 987.77, 1318.51];
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth'; // موج اره‌ای با صدای واضح‌تر
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.12);

    gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.12);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + idx * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.12 + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + idx * 0.12);
    osc.stop(audioCtx.currentTime + idx * 0.12 + 0.4);
  });
}

let triggeredReminders = new Set();
let currentToastTaskId = null;

function scanReminders() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayFa = formatShamsiDate(new Date());
  const activeFa = formatShamsiDate(activeDate);

  if (todayFa === activeFa && currentPlannerState.tasksList) {
    currentPlannerState.tasksList.forEach(t => {
      if (t.time && t.reminder && !t.done) {
        const uid = `${todayFa}_task_${t.id}_${t.time}`;
        if (t.time === timeStr && !triggeredReminders.has(uid)) {
          triggeredReminders.add(uid);
          fireLoudAlarm(t.title || 'کار زمان‌دار', t.time, t.id);
        }
      }
    });
  }
}
setInterval(scanReminders, 10000);

function fireLoudAlarm(title, time, targetId) {
  playLoudAlarmMelody();
  if (!alarmInterval) {
    alarmInterval = setInterval(playLoudAlarmMelody, 2200); // تکرار مداوم تا توقف توسط کاربر
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🚨 هشدار پلنر Better Me', { body: `ساعت ${time}: ${title}`, icon: 'manifest.json' });
  }

  const toast = document.getElementById('reminderToast');
  document.getElementById('toastTime').textContent = time;
  document.getElementById('toastTaskText').textContent = title;
  currentToastTaskId = targetId;
  toast.classList.add('active');
}

document.getElementById('btnCompleteFromToast').addEventListener('click', () => {
  if (currentToastTaskId && currentPlannerState.tasksList) {
    const item = currentPlannerState.tasksList.find(t => t.id === currentToastTaskId);
    if (item) {
      item.done = true;
      triggerSave();
      renderTasks();
    }
  }
  stopAlarmSound();
});

document.getElementById('btnCloseToast').addEventListener('click', () => {
  stopAlarmSound();
});

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  document.getElementById('reminderToast').classList.remove('active');
}

// دکمه تست آلارم در تنظیمات
document.getElementById('btnTestAlarm').addEventListener('click', () => {
  playLoudAlarmMelody();
  const toast = document.getElementById('reminderToast');
  document.getElementById('toastTime').textContent = 'تست';
  document.getElementById('toastTaskText').textContent = 'آلارم با موفقیت تست شد!';
  toast.classList.add('active');
  if (!alarmInterval) {
    alarmInterval = setInterval(playLoudAlarmMelody, 2200);
  }
});

// ==========================================
// انبار داده‌های محلی و تم‌ها
// ==========================================
function applyTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('better_me_selected_theme', themeName);
  
  document.querySelectorAll('.theme-preview-card').forEach(card => {
    card.classList.toggle('selected-theme', card.getAttribute('data-theme') === themeName);
  });
}

function readStorageData() {
  const raw = localStorage.getItem(storeKey);
  if (raw) {
    try { currentPlannerState = JSON.parse(raw); } catch { currentPlannerState = getInitialStore(); }
  } else {
    currentPlannerState = getInitialStore();
  }

  if (!Array.isArray(currentPlannerState.tasksList)) currentPlannerState.tasksList = [];
  if (!Array.isArray(currentPlannerState.timePhases)) currentPlannerState.timePhases = getDefaultTimePhases();

  document.querySelectorAll('[data-key]').forEach((el) => {
    const k = el.getAttribute('data-key');
    if (el.type === 'checkbox') el.checked = !!currentPlannerState.inputsData[k];
    else el.value = currentPlannerState.inputsData[k] || '';
  });

  renderWaterCups();
  document.querySelectorAll('.mood-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-mood') === currentPlannerState.activeMood);
  });
  document.querySelectorAll('.stars-rating').forEach((group) => {
    const key = group.getAttribute('data-rating');
    const val = currentPlannerState.ratingValues[key] || 0;
    group.querySelectorAll('.star-dot').forEach((dot) => {
      dot.classList.toggle('filled', parseInt(dot.getAttribute('data-val')) <= val);
    });
  });

  renderTimePhases();
  renderTasks();
  renderShop();
  renderHabits();
  calculateProgressPercent();
  
  const savedTheme = localStorage.getItem('better_me_selected_theme') || 'default';
  applyTheme(savedTheme);
}

function triggerSave() {
  document.querySelectorAll('[data-key]').forEach((el) => {
    const k = el.getAttribute('data-key');
    if (el.type === 'checkbox') currentPlannerState.inputsData[k] = el.checked;
    else currentPlannerState.inputsData[k] = el.value;
  });

  localStorage.setItem(storeKey, JSON.stringify(currentPlannerState));

  const toast = document.getElementById('saveToast');
  toast.classList.add('show');
  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(() => toast.classList.remove('show'), 1200);

  calculateProgressPercent();
}

function calculateProgressPercent() {
  const checkBoxes = document.querySelectorAll('input[type="checkbox"]');
  let checkedCount = 0;
  checkBoxes.forEach((c) => { if (c.checked) checkedCount++; });
  const total = checkBoxes.length;
  const ratio = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  document.getElementById('footerPercentText').textContent = `امروز: ${ratio}٪ کامل شده`;
  document.getElementById('footerProgressBar').style.width = `${ratio}%`;
}

// فازهای زمانی روزانه
function renderTimePhases() {
  const container = document.getElementById('customTimePhasesContainer');
  if (!container) return;
  container.innerHTML = '';

  (currentPlannerState.timePhases || []).forEach((phase, index) => {
    const row = document.createElement('div');
    row.className = `time-phase-row ${phase.done ? 'completed-phase' : ''}`;
    row.innerHTML = `
      <div class="time-range-group">
        <input type="time" class="time-field phase-start" value="${phase.start}">
        <span class="time-range-sep">-</span>
        <input type="time" class="time-field phase-end" value="${phase.end}">
      </div>
      <input type="text" class="phase-title-field" value="${phase.title || ''}" placeholder="نام فاز...">
      <button class="btn-bell-toggle ${phase.reminder ? 'on' : ''}">${phase.reminder ? '🔔' : '🔕'}</button>
      <label class="custom-chk mini-chk"><input type="checkbox" class="phase-done-chk" ${phase.done ? 'checked' : ''}><span class="chk-tile"></span></label>
      <button class="btn-del-mini phase-del-btn">×</button>
    `;

    const startInput = row.querySelector('.phase-start');
    const endInput = row.querySelector('.phase-end');
    const titleInput = row.querySelector('.phase-title-field');
    const bellBtn = row.querySelector('.btn-bell-toggle');
    const doneChk = row.querySelector('.phase-done-chk');
    const delBtn = row.querySelector('.phase-del-btn');

    startInput.addEventListener('change', () => { phase.start = startInput.value; triggerSave(); });
    endInput.addEventListener('change', () => { phase.end = endInput.value; triggerSave(); });
    titleInput.addEventListener('input', () => { phase.title = titleInput.value; triggerSave(); });
    bellBtn.addEventListener('click', () => {
      phase.reminder = !phase.reminder;
      bellBtn.textContent = phase.reminder ? '🔔' : '🔕';
      bellBtn.classList.toggle('on', phase.reminder);
      triggerSave();
    });
    doneChk.addEventListener('change', () => {
      phase.done = doneChk.checked;
      row.classList.toggle('completed-phase', phase.done);
      triggerSave();
    });
    delBtn.addEventListener('click', () => {
      currentPlannerState.timePhases.splice(index, 1);
      renderTimePhases();
      triggerSave();
    });

    container.appendChild(row);
  });
}

document.getElementById('btnAddTimePhase').addEventListener('click', () => {
  currentPlannerState.timePhases.push({
    id: 'ph_' + Date.now(), start: '12:00', end: '14:00', title: 'فاز جدید', done: false, reminder: true
  });
  renderTimePhases();
  triggerSave();
});

function renderTasks() {
  const box = document.getElementById('taskListContainer');
  box.innerHTML = '';
  (currentPlannerState.tasksList || []).forEach((t, i) => {
    const row = document.createElement('div');
    row.className = `dynamic-task-row ${t.done ? 'completed' : ''}`;
    row.innerHTML = `
      <label class="custom-chk"><input type="checkbox" ${t.done ? 'checked' : ''}><span class="chk-tile"></span></label>
      <input type="text" class="task-text-input" value="${t.title || ''}" placeholder="عنوان کار...">
      <input type="time" class="task-time-picker" value="${t.time || ''}">
      <button class="btn-bell-toggle ${t.reminder ? 'on' : ''}">${t.reminder ? '🔔' : '🔕'}</button>
      <button class="btn-del-mini">×</button>
    `;

    const chk = row.querySelector('input[type="checkbox"]');
    const txt = row.querySelector('.task-text-input');
    const timePick = row.querySelector('.task-time-picker');
    const bell = row.querySelector('.btn-bell-toggle');
    const del = row.querySelector('.btn-del-mini');

    chk.addEventListener('change', () => { t.done = chk.checked; row.classList.toggle('completed', t.done); triggerSave(); });
    txt.addEventListener('input', () => { t.title = txt.value; triggerSave(); });
    timePick.addEventListener('change', () => { t.time = timePick.value; triggerSave(); });
    bell.addEventListener('click', () => {
      t.reminder = !t.reminder;
      bell.textContent = t.reminder ? '🔔' : '🔕';
      bell.classList.toggle('on', t.reminder);
      triggerSave();
    });
    del.addEventListener('click', () => {
      currentPlannerState.tasksList.splice(i, 1);
      renderTasks();
      triggerSave();
    });

    box.appendChild(row);
  });
}

function renderShop() {
  const box = document.getElementById('shopListContainer');
  box.innerHTML = '';
  (currentPlannerState.shoppingList || []).forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'dynamic-task-row';
    row.innerHTML = `
      <label class="custom-chk"><input type="checkbox" ${s.done ? 'checked' : ''}><span class="chk-tile"></span></label>
      <input type="text" class="task-text-input" value="${s.title}" placeholder="مورد خرید...">
      <button class="btn-del-mini">×</button>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => { s.done = e.target.checked; triggerSave(); });
    row.querySelector('input[type="text"]').addEventListener('input', (e) => { s.title = e.target.value; triggerSave(); });
    row.querySelector('.btn-del-mini').addEventListener('click', () => {
      currentPlannerState.shoppingList.splice(i, 1);
      renderShop();
      triggerSave();
    });
    box.appendChild(row);
  });
}

function renderHabits() {
  const list = document.getElementById('habitsDynamicList');
  list.innerHTML = '';
  (currentPlannerState.habitTracker || []).forEach((h, hIdx) => {
    const row = document.createElement('div');
    row.className = 'habit-dynamic-item';
    let dots = '';
    for (let d = 0; d < 7; d++) dots += `<div class="h-dot ${h.days[d] ? 'active' : ''}" data-h="${hIdx}" data-d="${d}"></div>`;
    row.innerHTML = `<span class="h-title">${h.name}</span><div class="habit-days-row">${dots}</div>`;
    row.querySelectorAll('.h-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const day = parseInt(dot.getAttribute('data-d'));
        h.days[day] = !h.days[day];
        dot.classList.toggle('active', h.days[day]);
        triggerSave();
      });
    });
    list.appendChild(row);
  });
}

function renderWaterCups() {
  const wrapper = document.getElementById('waterGlassesWrapper');
  wrapper.innerHTML = '';
  const total = Math.max(8, currentPlannerState.waterCups || 8);
  for (let i = 1; i <= total; i++) {
    const cup = document.createElement('div');
    cup.className = `water-glass-shape ${i <= (currentPlannerState.waterCups || 0) ? 'filled' : ''}`;
    cup.addEventListener('click', () => {
      currentPlannerState.waterCups = (currentPlannerState.waterCups === i) ? i - 1 : i;
      renderWaterCups();
      triggerSave();
    });
    wrapper.appendChild(cup);
  }
}

document.querySelectorAll('.mood-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const m = btn.getAttribute('data-mood');
    currentPlannerState.activeMood = (currentPlannerState.activeMood === m) ? '' : m;
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-mood') === currentPlannerState.activeMood));
    triggerSave();
  });
});

document.querySelectorAll('.stars-rating .star-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const parent = dot.parentElement;
    const rKey = parent.getAttribute('data-rating');
    const dotVal = parseInt(dot.getAttribute('data-val'));
    const currVal = currentPlannerState.ratingValues[rKey] || 0;
    currentPlannerState.ratingValues[rKey] = (currVal === dotVal) ? 0 : dotVal;
    parent.querySelectorAll('.star-dot').forEach(d => d.classList.toggle('filled', parseInt(d.getAttribute('data-val')) <= currentPlannerState.ratingValues[rKey]));
    triggerSave();
  });
});

document.getElementById('btnAddTask').addEventListener('click', () => {
  currentPlannerState.tasksList.push({ id: 't_' + Date.now(), title: '', time: '16:00', reminder: true, done: false });
  renderTasks();
  triggerSave();
});
document.getElementById('btnAddShop').addEventListener('click', () => {
  currentPlannerState.shoppingList.push({ id: 's_' + Date.now(), title: '', done: false });
  renderShop();
  triggerSave();
});
document.getElementById('addGlassBtn').addEventListener('click', () => {
  currentPlannerState.waterCups = (currentPlannerState.waterCups || 0) + 1;
  renderWaterCups();
  triggerSave();
});
document.getElementById('addHabitBtn').addEventListener('click', () => {
  const nameInput = document.querySelector('[data-key="new_habit_title"]');
  const val = nameInput.value.trim();
  if (val) {
    currentPlannerState.habitTracker.push({ name: val, days: [false, false, false, false, false, false, false] });
    nameInput.value = '';
    renderHabits();
    triggerSave();
  }
});

document.addEventListener('input', (e) => { if (e.target.matches('[data-key]')) triggerSave(); });
document.addEventListener('change', (e) => { if (e.target.matches('[data-key]')) triggerSave(); });

document.getElementById('prevDayBtn').addEventListener('click', () => { activeDate.setDate(activeDate.getDate() - 1); refreshDateAndUI(); });
document.getElementById('nextDayBtn').addEventListener('click', () => { activeDate.setDate(activeDate.getDate() + 1); refreshDateAndUI(); });

let calDatePivot = new Date();
function drawCalendar() {
  const title = document.getElementById('calMonthTitle');
  const grid = document.getElementById('calDaysGrid');
  if (!grid) return;
  title.textContent = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(calDatePivot);
  grid.innerHTML = '';
  let tr = document.createElement('tr');
  for (let day = 1; day <= 30; day++) {
    const td = document.createElement('td');
    const span = document.createElement('div');
    span.className = 'cal-day-num';
    span.textContent = day;
    if (day === 22) span.classList.add('marked');
    span.addEventListener('click', () => {
      document.querySelectorAll('.cal-day-num').forEach(s => s.classList.remove('active'));
      span.classList.add('active');
    });
    td.appendChild(span);
    tr.appendChild(td);
    if (day % 7 === 0 || day === 30) { grid.appendChild(tr); tr = document.createElement('tr'); }
  }
}
document.getElementById('prevMonthBtn')?.addEventListener('click', () => { calDatePivot.setMonth(calDatePivot.getMonth() - 1); drawCalendar(); });
document.getElementById('nextMonthBtn')?.addEventListener('click', () => { calDatePivot.setMonth(calDatePivot.getMonth() + 1); drawCalendar(); });

const modal = document.getElementById('modalConfirm');
document.getElementById('clearBtn').addEventListener('click', () => modal.classList.add('active'));
document.getElementById('btnCancelDelete').addEventListener('click', () => modal.classList.remove('active'));
document.getElementById('btnYesDelete').addEventListener('click', () => {
  localStorage.removeItem(storeKey);
  currentPlannerState = getInitialStore();
  readStorageData();
  modal.classList.remove('active');
});

// ==========================================
// تنظیمات و انتخابگر رنگی بصری تم‌ها (6 Theme Selector)
// ==========================================
document.getElementById('openSettingsBtn').addEventListener('click', () => {
  const currentTheme = localStorage.getItem('better_me_selected_theme') || 'default';
  applyTheme(currentTheme);
  document.getElementById('settingsModal').classList.add('active');
});
document.getElementById('btnCloseSettingsModal').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('active');
});

document.querySelectorAll('.theme-preview-card').forEach(card => {
  card.addEventListener('click', () => {
    const themeName = card.getAttribute('data-theme');
    applyTheme(themeName);
  });
});

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', () => {
  refreshDateAndUI();
  const savedTheme = localStorage.getItem('better_me_selected_theme') || 'default';
  applyTheme(savedTheme);
});