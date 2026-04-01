/* =============================================
   AI GUIDELINES MURAL BOARD — APP LOGIC
   ============================================= */

'use strict';

// ── Theme toggle ──────────────────────────────
(function () {
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let current = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', current);
  updateToggleIcon();

  if (toggle) {
    toggle.addEventListener('click', () => {
      current = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', current);
      updateToggleIcon();
    });
  }

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.setAttribute('aria-label', `Switch to ${current === 'dark' ? 'light' : 'dark'} mode`);
    toggle.innerHTML = current === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="5"/>
           <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
         </svg>`;
  }
})();

// ── State ─────────────────────────────────────
const STATE = {
  notes: [],
  noteCounter: 0,
};

const THEMES = ['transparency', 'dataprivacy', 'academicintegrity', 'humanvalidation', 'ethics'];

// ── Utilities ─────────────────────────────────
function saveState() {
}

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getRelativeLabel(n) {
  const labels = ['Participant 1', 'Participant 2', 'Participant 3', 'Participant 4', 'You'];
  return `You (Note ${n})`;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

function updateCounts() {
  let total = 0;
  THEMES.forEach(theme => {
    const zone = document.getElementById(`zone-${theme}`);
    const count = zone ? zone.querySelectorAll('.sticky-note').length : 0;
    total += count;

    // Badge
    const badge = document.getElementById(`badge-${theme}`);
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('has-notes', count > 0);
    }

    // Empty state
    const empty = document.getElementById(`empty-${theme}`);
    if (empty) empty.classList.toggle('hidden', count > 0);
  });

  // Note count pills
  const countEl = document.getElementById('note-count');
  if (countEl) countEl.textContent = total;

  const footerEl = document.getElementById('footer-note-count');
  if (footerEl) footerEl.textContent = `${total} note${total !== 1 ? 's' : ''} shared`;
}

// ── Create a sticky note element ──────────────
function createNoteEl(note) {
  const div = document.createElement('div');
  div.className = `sticky-note note-${note.theme}`;
  div.setAttribute('draggable', 'true');
  div.dataset.id = note.id;

  div.innerHTML = `
    <div class="note-header">
      <span class="note-author-label">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        ${escapeHtml(note.author)}
      </span>
      <span class="note-timestamp">${note.time}</span>
    </div>
    <div class="note-body">
      <p class="note-text">${escapeHtml(note.text)}</p>
    </div>
    <button class="note-delete" title="Remove note" aria-label="Delete this note">×</button>
  `;

  // Delete
  div.querySelector('.note-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    removeNote(note.id, div);
  });

  // Drag events
  div.addEventListener('dragstart', onDragStart);
  div.addEventListener('dragend', onDragEnd);

  return div;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ── Add note ──────────────────────────────────
function addNote(theme, text) {
  if (!text.trim()) return;

  STATE.noteCounter++;
  const note = {
    id: `note-${Date.now()}-${STATE.noteCounter}`,
    theme,
    text: text.trim(),
    author: `You (Note ${STATE.noteCounter})`,
    time: getTimestamp(),
  };

  STATE.notes.push(note);
  saveState();

  const zone = document.getElementById(`zone-${theme}`);
  if (!zone) return;

  const el = createNoteEl(note);
  zone.appendChild(el);
  updateCounts();
  showToast('Sticky note added');

  // Scroll note into view
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

// ── Remove note ───────────────────────────────
function removeNote(id, el) {
  el.style.transition = 'all 0.2s ease';
  el.style.transform = 'scale(0.85) translateY(-4px)';
  el.style.opacity = '0';
  setTimeout(() => {
    el.remove();
    STATE.notes = STATE.notes.filter(n => n.id !== id);
    saveState();
    updateCounts();
  }, 200);
  showToast('Note removed');
}

// ── Drag and drop ─────────────────────────────
let dragSrc = null;

function onDragStart(e) {
  dragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.sticky-zone').forEach(z => z.classList.remove('drag-over'));
}

function initDropZones() {
  document.querySelectorAll('.sticky-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');

      // Insert placeholder position
      const afterElement = getDragAfterElement(zone, e.clientY);
      if (dragSrc) {
        if (afterElement == null) {
          zone.appendChild(dragSrc);
        } else {
          zone.insertBefore(dragSrc, afterElement);
        }
      }
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over');
      }
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      updateCounts();
      showToast('Note moved');
    });
  });
}

function getDragAfterElement(container, y) {
  const draggables = [...container.querySelectorAll('.sticky-note:not(.dragging)')];
  return draggables.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ── Input bindings ────────────────────────────
function bindInputs() {
  // Add note via button
  document.querySelectorAll('.add-note-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.zone;
      const input = document.querySelector(`.note-input[data-zone="${theme}"]`);
      if (!input) return;
      addNote(theme, input.value);
      input.value = '';
      input.focus();
    });
  });

  // Add note via Enter key
  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const theme = input.dataset.zone;
        addNote(theme, input.value);
        input.value = '';
      }
    });
  });
}

// ── Discussion prompts ────────────────────────
function bindPrompts() {
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const wasExpanded = card.classList.contains('expanded');
      // Collapse all
      document.querySelectorAll('.prompt-card').forEach(c => c.classList.remove('expanded'));
      if (!wasExpanded) {
        card.classList.add('expanded');
        // Copy prompt to nearby input
        const section = card.closest('.theme-column');
        if (section) {
          const zone = section.dataset.themeId;
          const input = section.querySelector(`.note-input[data-zone="${zone}"]`);
          if (input && !input.value) {
            // Pre-fill as reference (user can clear and type their response)
            input.placeholder = `Respond to: "${card.querySelector('.prompt-q').textContent}"`;
            input.focus();
            setTimeout(() => {
              input.placeholder = 'Add a sticky note…';
            }, 8000);
          }
        }
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// ── Export notes ──────────────────────────────
function bindExport() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const lines = ['AI Guidelines Feedback Board — Notes Export', '='.repeat(48), ''];

    THEMES.forEach(theme => {
      const zone = document.getElementById(`zone-${theme}`);
      const notes = zone ? [...zone.querySelectorAll('.sticky-note')] : [];
      const themeTitle = theme.charAt(0).toUpperCase() + theme.slice(1);
      lines.push(`## ${themeTitle} (${notes.length} note${notes.length !== 1 ? 's' : ''})`);

      if (notes.length === 0) {
        lines.push('  (no notes added)');
      } else {
        notes.forEach((n, i) => {
          const text = n.querySelector('.note-text')?.textContent || '';
          const time = n.querySelector('.note-timestamp')?.textContent || '';
          lines.push(`  ${i + 1}. [${time}] ${text}`);
        });
      }
      lines.push('');
    });

    lines.push(`Exported: ${new Date().toLocaleString()}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-guidelines-feedback-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Notes exported as .txt');
  });
}

// ── Clear all notes ───────────────────────────
function bindClear() {
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    const count = STATE.notes.length;
    if (count === 0) {
      showToast('No notes to clear');
      return;
    }

    if (!confirm(`Remove all ${count} note${count !== 1 ? 's' : ''} you added? This cannot be undone.`)) return;

    // Animate out
    document.querySelectorAll('.sticky-note').forEach(el => {
      el.style.transition = 'all 0.15s ease';
      el.style.transform = 'scale(0.8) translateY(-6px)';
      el.style.opacity = '0';
    });

    setTimeout(() => {
      document.querySelectorAll('.sticky-note').forEach(el => el.remove());
      STATE.notes = [];
      STATE.noteCounter = 0;
      saveState();
      updateCounts();
      showToast('All notes cleared');
    }, 180);
  });
}

// ── Restore notes from session ────────────────
function restoreNotes() {
  STATE.notes.forEach(note => {
    const zone = document.getElementById(`zone-${note.theme}`);
    if (!zone) return;
    const el = createNoteEl(note);
    el.style.animation = 'none'; // don't animate restored notes
    zone.appendChild(el);
  });
  updateCounts();
}

// ── Pre-seed demo notes ───────────────────────
const DEMO_NOTES = [
  { theme: 'transparency', text: 'Example: These guidelines are useful but need clearer definitions of what "transparency" means in practice for different stakeholders.' },
  { theme: 'dataprivacy', text: 'Example: Missing guidance on how to handle Indigenous or tribal community data — CARE principles should be referenced.' },
  { theme: 'academicintegrity', text: 'Example: The guidelines could be more actionable if they included specific citation formats for AI-generated content.' },
  { theme: 'humanvalidation', text: 'Example: Hard to apply when timelines are tight — guidelines should address resource constraints.' },
  { theme: 'ethics', text: 'Example: Challenging to apply when institutional incentives conflict with ethical AI use.' },
];

function seedDemoNotes() {
  if (STATE.notes.length > 0) return; // Don't seed if user already has notes

  DEMO_NOTES.forEach((d, i) => {
    const note = {
      id: `demo-${i}`,
      theme: d.theme,
      text: d.text,
      author: 'Example Note',
      time: '—',
    };
    const zone = document.getElementById(`zone-${note.theme}`);
    if (!zone) return;
    const el = createNoteEl(note);
    el.style.animation = 'none';
    // Style demo notes slightly differently
    el.style.opacity = '0.82';
    el.setAttribute('draggable', 'true');
    zone.appendChild(el);
  });
  updateCounts();
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreNotes();
  seedDemoNotes();
  initDropZones();
  bindInputs();
  bindPrompts();
  bindExport();
  bindClear();
  updateCounts();
});
