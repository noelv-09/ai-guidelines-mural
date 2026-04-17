/* =============================================
   AI GUIDELINES MURAL BOARD — REAL-TIME APP
   Powered by Firebase Realtime Database
   ============================================= */

'use strict';

// ── Firebase config ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDWyhyBEfM1DzWKRLJAhHRr1QhIF3ATg5I",
  authDomain: "ai-guidelines-mural.firebaseapp.com",
  databaseURL: "https://ai-guidelines-mural-default-rtdb.firebaseio.com",
  projectId: "ai-guidelines-mural",
  storageBucket: "ai-guidelines-mural.firebasestorage.app",
  messagingSenderId: "171997614846",
  appId: "1:171997614846:web:409ce65ac24375ccb0cbaf"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const notesRef = db.ref('notes');

// ── Anonymous session ID (ephemeral, not stored) ──
function getSessionId() {
  if (!window._sessionId) {
    window._sessionId = Math.random().toString(36).slice(2, 10);
  }
  return window._sessionId;
}

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
    toggle.innerHTML = current === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
})();

// ── Constants ─────────────────────────────────
const THEMES = ['transparency', 'dataprivacy', 'academicintegrity', 'humanvalidation', 'ethics', 'generalfeedback'];
const renderedNotes = new Set();

// ── Utilities ─────────────────────────────────
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
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
    const badge = document.getElementById(`badge-${theme}`);
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('has-notes', count > 0);
    }
    const empty = document.getElementById(`empty-${theme}`);
    if (empty) empty.classList.toggle('hidden', count > 0);
  });
  const countEl = document.getElementById('note-count');
  if (countEl) countEl.textContent = total;
  const footerEl = document.getElementById('footer-note-count');
  if (footerEl) footerEl.textContent = `${total} note${total !== 1 ? 's' : ''} shared`;
}

// ── Create sticky note DOM element ────────────
function createNoteEl(note) {
  const div = document.createElement('div');
  div.className = `sticky-note note-${note.theme}`;
  div.setAttribute('draggable', 'true');
  div.dataset.id = note.id;
  div.dataset.uid = note.uid || '';

  const isMine = note.uid === getSessionId();
  const upvotes = note.upvotes || 0;
  const myUpvoteKey = `upvoted_${note.id}`;
  const hasUpvoted = window[myUpvoteKey] || false;

  div.innerHTML = `
    <div class="note-header">
      <span class="note-anon-label">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        Anonymous
      </span>
      <span class="note-timestamp">${escapeHtml(note.time)}${note.edited ? ' · edited' : ''}</span>
    </div>
    <div class="note-body">
      <p class="note-text">${escapeHtml(note.text)}</p>
      ${isMine ? `<textarea class="note-edit-input" maxlength="200" style="display:none">${escapeHtml(note.text)}</textarea>
      <div class="note-edit-actions" style="display:none">
        <button class="note-save-btn">Save</button>
        <button class="note-cancel-btn">Cancel</button>
      </div>` : ''}
    </div>
    <div class="note-footer-row">
      <button class="note-upvote-btn ${hasUpvoted ? 'upvoted' : ''}" data-id="${note.id}" aria-label="Upvote this note" title="Upvote">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="${hasUpvoted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        <span class="upvote-count">${upvotes > 0 ? upvotes : ''}</span>
      </button>
      ${isMine ? `<div class="note-action-btns">
        <button class="note-edit-btn" title="Edit note" aria-label="Edit this note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="note-delete" title="Remove note" aria-label="Delete this note">×</button>
      </div>` : ''}
    </div>
  `;

  // Upvote logic
  const upvoteBtn = div.querySelector('.note-upvote-btn');
  upvoteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const already = window[myUpvoteKey] || false;
    const ref = notesRef.child(note.id);
    if (already) {
      // Undo upvote
      ref.transaction(n => {
        if (n) n.upvotes = Math.max(0, (n.upvotes || 0) - 1);
        return n;
      });
      window[myUpvoteKey] = false;
      upvoteBtn.classList.remove('upvoted');
      upvoteBtn.querySelector('svg').setAttribute('fill', 'none');
    } else {
      // Add upvote
      ref.transaction(n => {
        if (n) n.upvotes = (n.upvotes || 0) + 1;
        return n;
      });
      window[myUpvoteKey] = true;
      upvoteBtn.classList.add('upvoted');
      upvoteBtn.querySelector('svg').setAttribute('fill', 'currentColor');
    }
  });

  // Edit logic (own notes only)
  if (isMine) {
    const editBtn = div.querySelector('.note-edit-btn');
    const deleteBtn = div.querySelector('.note-delete');
    const textEl = div.querySelector('.note-text');
    const textarea = div.querySelector('.note-edit-input');
    const editActions = div.querySelector('.note-edit-actions');
    const saveBtn = div.querySelector('.note-save-btn');
    const cancelBtn = div.querySelector('.note-cancel-btn');

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.id, div);
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      textEl.style.display = 'none';
      textarea.style.display = 'block';
      editActions.style.display = 'flex';
      editBtn.style.display = 'none';
      div.setAttribute('draggable', 'false');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exitEditMode(div, textEl, textarea, editActions, editBtn);
    });

    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newText = textarea.value.trim();
      if (!newText) return;
      if (newText !== note.text) {
        notesRef.child(note.id).update({ text: newText, edited: true });
        showToast('Note updated');
      }
      exitEditMode(div, textEl, textarea, editActions, editBtn);
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
      if (e.key === 'Escape') cancelBtn.click();
    });
  }

  div.addEventListener('dragstart', onDragStart);
  div.addEventListener('dragend', onDragEnd);

  return div;
}

function exitEditMode(div, textEl, textarea, editActions, editBtn) {
  textEl.style.display = 'block';
  textarea.style.display = 'none';
  editActions.style.display = 'none';
  editBtn.style.display = 'flex';
  div.setAttribute('draggable', 'true');
}

// ── Firebase: write note ──────────────────────
function addNote(theme, text) {
  if (!text.trim()) return;
  const newRef = notesRef.push();
  newRef.set({
    id: newRef.key,
    theme,
    text: text.trim(),
    time: getTimestamp(),
    uid: getSessionId(),
    upvotes: 0,
    createdAt: Date.now(),
  });
  showToast('Note added');
}

// ── Firebase: delete note ─────────────────────
function deleteNote(id, el) {
  el.style.transition = 'all 0.2s ease';
  el.style.transform = 'scale(0.85) translateY(-4px)';
  el.style.opacity = '0';
  setTimeout(() => notesRef.child(id).remove(), 180);
  showToast('Note removed');
}

// ── Firebase: real-time listeners ─────────────
function listenToNotes() {
  notesRef.orderByChild('createdAt').on('child_added', (snapshot) => {
    const note = snapshot.val();
    if (!note || renderedNotes.has(note.id)) return;
    renderedNotes.add(note.id);
    const zone = document.getElementById(`zone-${note.theme}`);
    if (!zone) return;
    zone.appendChild(createNoteEl(note));
    updateCounts();
  });

  notesRef.on('child_changed', (snapshot) => {
    const note = snapshot.val();
    if (!note) return;
    const el = document.querySelector(`.sticky-note[data-id="${note.id}"]`);
    if (!el) return;
    // Update text
    const textEl = el.querySelector('.note-text');
    if (textEl) textEl.textContent = note.text;
    const textarea = el.querySelector('.note-edit-input');
    if (textarea) textarea.value = note.text;
    // Update timestamp with edited marker
    const ts = el.querySelector('.note-timestamp');
    if (ts && note.edited) ts.textContent = note.time + ' · edited';
    // Update upvote count
    const upvoteCount = el.querySelector('.upvote-count');
    const upvotes = note.upvotes || 0;
    if (upvoteCount) upvoteCount.textContent = upvotes > 0 ? upvotes : '';
  });

  notesRef.on('child_removed', (snapshot) => {
    const note = snapshot.val();
    if (!note) return;
    renderedNotes.delete(note.id);
    const el = document.querySelector(`.sticky-note[data-id="${note.id}"]`);
    if (el) {
      el.style.transition = 'all 0.2s ease';
      el.style.transform = 'scale(0.85) translateY(-4px)';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); updateCounts(); }, 200);
    }
  });
}

// ── Connection status ─────────────────────────
function initConnectionStatus() {
  const connRef = db.ref('.info/connected');
  const badge = document.getElementById('session-badge');
  connRef.on('value', (snap) => {
    if (!badge) return;
    if (snap.val()) {
      badge.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="var(--color-success)"/></svg> Live · Connected`;
      badge.style.color = 'var(--color-success)';
    } else {
      badge.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#d97706"/></svg> Reconnecting…`;
      badge.style.color = '#d97706';
    }
  });
}

// ── Drag and drop ─────────────────────────────
let dragSrc = null;
function onDragStart(e) {
  dragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.sticky-zone').forEach(z => z.classList.remove('drag-over'));
}
function initDropZones() {
  document.querySelectorAll('.sticky-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
      const after = getDragAfterElement(zone, e.clientY);
      if (dragSrc) after == null ? zone.appendChild(dragSrc) : zone.insertBefore(dragSrc, after);
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });
}
function getDragAfterElement(container, y) {
  const draggables = [...container.querySelectorAll('.sticky-note:not(.dragging)')];
  return draggables.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ── Input bindings ────────────────────────────
function bindInputs() {
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
  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addNote(input.dataset.zone, input.value);
        input.value = '';
      }
    });
  });
}

// ── Guidelines viewer ─────────────────────────
function initGuidelinesViewer() {
  const btn = document.getElementById('view-guidelines-btn');
  const panel = document.getElementById('guidelines-panel');
  const closeBtn = document.getElementById('close-guidelines-btn');
  const overlay = document.getElementById('guidelines-overlay');

  function openPanel() {
    panel.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  btn?.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);
  overlay?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
}

// ── Export ────────────────────────────────────
function bindExport() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const THEME_LABELS = {
      transparency: 'Transparency',
      dataprivacy: 'Data Privacy',
      academicintegrity: 'Academic Integrity',
      humanvalidation: 'Human Validation',
      ethics: 'Ethics',
      generalfeedback: 'General Feedback',
    };
    const lines = ['AI Guidelines Feedback Board — Notes Export', '='.repeat(48), ''];
    THEMES.forEach(theme => {
      const zone = document.getElementById(`zone-${theme}`);
      const notes = zone ? [...zone.querySelectorAll('.sticky-note')] : [];
      lines.push(`## ${THEME_LABELS[theme]} (${notes.length} note${notes.length !== 1 ? 's' : ''})`);
      if (notes.length === 0) {
        lines.push('  (no notes added)');
      } else {
        notes.forEach((n, i) => {
          const text = n.querySelector('.note-text')?.textContent || '';
          const upvotes = n.querySelector('.upvote-count')?.textContent || '0';
          const time = n.querySelector('.note-timestamp')?.textContent || '';
          lines.push(`  ${i + 1}. [${time}] [↑${upvotes || 0}] ${text}`);
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
    showToast('Notes exported');
  });
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDropZones();
  bindInputs();
  bindExport();
  initConnectionStatus();
  initGuidelinesViewer();
  listenToNotes();
});
