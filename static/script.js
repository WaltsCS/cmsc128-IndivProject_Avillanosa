const listEl = document.getElementById('list');
let lastDeleted = null;

//event delegation for clicks inside task list
listEl.addEventListener('click', async (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.classList.contains('toggle')) {
    await toggleTask(id);
    await load();
    return;
  }

  if (e.target.classList.contains('del')) {
    if (confirm('Delete this task?')) {
      //store for undo
      const title = card.querySelector('.title').textContent;
      const meta = card.querySelector('.mono').textContent;
      const nodes = card.querySelectorAll('.mono span');
      const dueText =
        nodes.length > 1 ? nodes[1].textContent.replace('Due: ', '') : '';
      const [due_date, due_time] = dueText.split(' ');
      const priority =
        card.querySelector('.badge')?.textContent || 'Low';
      lastDeleted = {
        title,
        priority,
        due_date:
          due_date === '—' ? null : due_date || null,
        due_time: due_time || null,
      };
      await deleteTask(id);
      showToast('Task deleted.');
      await load();
    }
    return;
  }

  if (e.target.classList.contains('edit')) {
    openEdit(card, id);
  }
});

//edit form replacement
function openEdit(card, id) {
  const titleEl = card.querySelector('.title');
  const oldTitle = titleEl.textContent;
  const oldPriority =
    card.querySelector('.badge')?.textContent || 'Low';
  const mono = card.querySelector('.mono');
  const parts = [...mono.querySelectorAll('span')];
  const dueBits = (
    parts[1]?.textContent.replace('Due: ', '') || ''
  ).split(' ');
  const oldDueDate =
    dueBits[0] === '—' ? '' : dueBits[0] || '';
  const oldDueTime = dueBits[1] || '';

  card.innerHTML = `
    <div class="space-y-3">
      <label class="block">
        <span class="block text-sm text-slate-600">Title</span>
        <input class="input" id="e_title" value="${escapeHtml(oldTitle)}" />
      </label>
      <div class="grid md:grid-cols-3 gap-3">
        <label>
          <span class="block text-sm text-slate-600">Priority</span>
          <select id="e_priority" class="input">
            <option ${oldPriority === 'High' ? 'selected' : ''}>High</option>
            <option ${oldPriority === 'Mid' ? 'selected' : ''}>Mid</option>
            <option ${oldPriority === 'Low' ? 'selected' : ''}>Low</option>
          </select>
        </label>
        <label>
          <span class="block text-sm text-slate-600">Due Date</span>
          <input id="e_due_date" class="input" type="date" value="${oldDueDate}" />
        </label>
        <label>
          <span class="block text-sm text-slate-600">Due Time</span>
          <input id="e_due_time" class="input" type="time" value="${oldDueTime}" />
        </label>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn" id="cancelEdit">Cancel</button>
        <button class="btn-primary" id="saveEdit">Save</button>
      </div>
    </div>`;

  card.querySelector('#cancelEdit').addEventListener('click', load);
  card.querySelector('#saveEdit').addEventListener('click', async () => {
    const title = card.querySelector('#e_title').value.trim();
    const priority = card.querySelector('#e_priority').value;
    const due_date = card.querySelector('#e_due_date').value || null;
    const due_time = card.querySelector('#e_due_time').value || null;
    if (!title) {
      alert('Title is required');
      return;
    }
    await updateTask(id, { title, priority, due_date, due_time });
    await load();
  });
}

//init load
load();
