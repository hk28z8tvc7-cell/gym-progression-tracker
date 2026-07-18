function todayView() {
  if (!state.draftWorkout) state.draftWorkout = blankDraft();
  const draft = state.draftWorkout;
  const favoriteTemplates = state.data.templates.filter((template) => template.favorite);
  const recentSessions = sortedSessions().slice(0, 4);
  return appLayout(`
    <div class="topbar">
      <div>
        <h2>${draft.id ? "Edit Workout" : "Today’s Workout"}</h2>
        <p>${escapeHtml(draft.workoutName)} · ${draft.date}</p>
      </div>
      <button class="btn primary" data-save-workout>${draft.id ? "Update Workout" : "Save Workout"}</button>
    </div>
    <div class="today-layout">
      <div>
        ${draft.exercises.length ? `<div class="grid">${draft.exercises.map(todayExerciseCard).join("")}</div>` : empty("Start blank, choose a workout, or add exercises from your exercise list.")}
      </div>
      <aside class="card workout-picker">
        <div class="form">
          <div class="field"><label>Workout name</label><input data-draft-name value="${escapeHtml(draft.workoutName)}" /></div>
          <div class="field"><label>Date</label><input type="date" data-draft-date value="${draft.date}" /></div>
          <div class="field"><label>Add exercise</label><select data-add-existing><option value="">Choose exercise</option>${state.data.exercises.map((exercise) => `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`).join("")}</select></div>
          <div class="actions">
            <button class="btn primary" data-add-selected-exercise>Add Selected</button>
            <button class="btn primary" data-new-exercise-to-draft>New Exercise</button>
            <button class="btn ghost" data-clear-draft>Start Blank</button>
          </div>
          <div class="field"><label>Use saved workout</label><select data-template-picker><option value="">Choose saved workout</option>${state.data.templates.map((template) => `<option value="${template.id}">${template.favorite ? "Favorite: " : ""}${escapeHtml(template.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Copy recent workout</label><select data-session-picker><option value="">Choose recent workout</option>${recentSessions.map((session) => `<option value="${session.id}">${session.date} · ${escapeHtml(session.workoutName)}</option>`).join("")}</select></div>
          <div class="field"><label>Workout notes</label><textarea data-draft-notes>${escapeHtml(draft.notes || "")}</textarea></div>
          <button class="btn primary" data-save-workout>${draft.id ? "Update Workout" : "Save Workout"}</button>
        </div>
        <div class="section">
          <div class="section-title"><h3>Favorites</h3></div>
          <div class="grid">${favoriteTemplates.length ? favoriteTemplates.map((template) => `<button class="btn ghost" data-use-template="${template.id}">${escapeHtml(template.name)}</button>`).join("") : empty("Favorite workouts will show here.")}</div>
        </div>
      </aside>
    </div>
  `);
}

function todayExerciseCard(entry, index) {
  const libraryExercise = state.data.exercises.find((exercise) => exercise.id === entry.exerciseId);
  const suggestion = libraryExercise ? suggestionForToday(libraryExercise) : { label: "Start", text: "New exercise. Log what you did today." };
  const last = historyForExercise(state.data, entry.exerciseId).at(-1);
  const lastStats = last ? setStats(last.exercise) : null;
  return `
    <div class="card exercise-card">
      <div class="exercise-head">
        <div>
          <h3>${escapeHtml(entry.name)}</h3>
          <div class="tag-row">
            <span class="tag">${escapeHtml(entry.category)}</span>
            <span class="tag">${entry.targetSets} sets</span>
            <span class="tag">${entry.repMin}-${entry.repMax} reps</span>
            <span class="tag ${suggestion.label.toLowerCase()}">${suggestion.label}</span>
          </div>
          <div class="last-line">${lastStats ? `Last: ${fmtWeight(lastStats.weight)} x ${lastStats.reps.join("/")}` : "Last: none yet"}</div>
        </div>
        <div class="actions">
          <button class="btn small" data-edit-draft-exercise="${index}">Edit</button>
          <button class="btn small danger" data-remove-draft-exercise="${index}">Delete</button>
        </div>
      </div>
      <div class="suggestion">${escapeHtml(suggestion.text)}</div>
      <div class="actions">
        <button class="btn small" data-same-last="${index}">Same as last time</button>
        <button class="btn small" data-inc-weight="${index}">+${fmtWeight(entry.increment)}</button>
        <button class="btn small" data-dec-weight="${index}">-${fmtWeight(entry.increment)}</button>
        <button class="btn small" data-add-set="${index}">Add set</button>
        <button class="btn small" data-remove-set="${index}">Remove set</button>
      </div>
      <div class="sets">
        ${entry.sets.map((set, setIndex) => `
          <div class="set-grid">
            <div class="set-number">${setIndex + 1}</div>
            <input inputmode="decimal" type="number" step="0.5" min="0" aria-label="Weight" data-set-weight="${index}:${setIndex}" value="${escapeHtml(set.weight)}" />
            <input inputmode="numeric" type="number" step="1" min="0" aria-label="Reps" data-set-reps="${index}:${setIndex}" value="${escapeHtml(set.reps)}" placeholder="reps" />
            <button class="btn small ghost" data-delete-set="${index}:${setIndex}">×</button>
          </div>
        `).join("")}
      </div>
      <div class="field" style="margin-top:10px">
        <label>Notes</label>
        <textarea data-entry-notes="${index}" placeholder="Machine settings, form notes, substitutions">${escapeHtml(entry.notes || "")}</textarea>
      </div>
    </div>
  `;
}

function templatesView() {
  return appLayout(`
    <div class="topbar">
      <div>
        <h2>Saved workouts & exercises</h2>
        <p>Saved workouts are quick starts. Your exercise list is separate, so each exercise keeps history across every workout.</p>
      </div>
      <div class="actions"><button class="btn primary" data-new-template>New Workout</button><button class="btn ghost" data-new-exercise>New Exercise</button></div>
    </div>
    <section class="section">
      <div class="section-title"><h3>Saved Workouts</h3></div>
      <div class="grid">${state.data.templates.map((template, index) => templateEditorCard(template, index)).join("")}</div>
    </section>
    <section class="section">
      <div class="section-title"><h3>Exercise List</h3></div>
      <div class="grid cols-2">${state.data.exercises.map(exerciseLibraryCard).join("")}</div>
    </section>
  `);
}

function templateEditorCard(template, index) {
  return `
    <div class="card template-card">
      <div class="template-head">
        <div>
          <h3>${escapeHtml(template.name)}${template.favorite ? " · Favorite" : ""}</h3>
          <p class="muted">${escapeHtml(template.description || "No description")}</p>
        </div>
        <div class="actions">
          <button class="btn small ghost" data-move-template="${template.id}" data-dir="-1" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="btn small ghost" data-move-template="${template.id}" data-dir="1" ${index === state.data.templates.length - 1 ? "disabled" : ""}>Down</button>
          <button class="btn small" data-edit-template="${template.id}">Edit</button>
          <button class="btn small" data-duplicate-template="${template.id}">Duplicate</button>
          <button class="btn small ghost" data-favorite-template="${template.id}">${template.favorite ? "Unfavorite" : "Favorite"}</button>
          <button class="btn small danger" data-delete-template="${template.id}">Delete</button>
        </div>
      </div>
      <div class="exercise-list">
        ${template.exerciseIds.map((id, eIndex) => `
          <div class="compact-exercise">
            <div><strong>${escapeHtml(exerciseName(id))}</strong><div class="muted">${escapeHtml(exerciseDetails(id))}</div></div>
            <div class="actions">
              <button class="btn small ghost" data-move-template-exercise="${template.id}:${id}" data-dir="-1" ${eIndex === 0 ? "disabled" : ""}>Up</button>
              <button class="btn small ghost" data-move-template-exercise="${template.id}:${id}" data-dir="1" ${eIndex === template.exerciseIds.length - 1 ? "disabled" : ""}>Down</button>
              <button class="btn small danger" data-remove-template-exercise="${template.id}:${id}">Remove</button>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="actions" style="margin-top:12px">
        <select data-template-add-exercise="${template.id}" style="max-width:260px"><option value="">Add exercise</option>${state.data.exercises.map((exercise) => `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`).join("")}</select>
        <button class="btn small primary" data-use-template="${template.id}">Use Workout</button>
      </div>
    </div>
  `;
}

function exerciseLibraryCard(exercise) {
  const suggestion = suggestionForToday(exercise);
  const history = historyForExercise(state.data, exercise.id);
  const last = history.at(-1);
  const stats = last ? setStats(last.exercise) : null;
  return `
    <div class="card template-card">
      <div class="template-head">
        <div>
          <h3>${escapeHtml(exercise.name)}</h3>
          <p class="muted">${escapeHtml(exercise.category)} · ${exercise.targetSets} sets · ${exercise.repMin}-${exercise.repMax} reps · +${fmtWeight(exercise.increment)}</p>
        </div>
        <div class="actions">
          <button class="btn small primary" data-add-exercise-direct="${exercise.id}">Add Today</button>
          <button class="btn small" data-edit-exercise="${exercise.id}">Edit</button>
          <button class="btn small danger" data-delete-exercise="${exercise.id}">Delete</button>
        </div>
      </div>
      <div class="tag-row">
        <span class="tag ${suggestion.label.toLowerCase()}">${suggestion.label}</span>
        <span class="tag">${stats ? `${fmtWeight(stats.weight)} x ${stats.reps.join("/")}` : "No history"}</span>
      </div>
      <p class="muted">${escapeHtml(exercise.notes || suggestion.text)}</p>
    </div>
  `;
}

function historyView() {
  const sessions = sortedSessions();
  return appLayout(`
    <div class="topbar">
      <div>
        <h2>Workout history</h2>
        <p>Edit, delete, favorite, or copy past workouts. Exercise progress still tracks across all of them.</p>
      </div>
      <button class="btn primary" data-start-blank>New Workout</button>
    </div>
    <div class="grid">${sessions.length ? sessions.map((session) => sessionCard(session)).join("") : empty("Saved workouts will appear here after you log them.")}</div>
  `);
}

function exerciseName(id) {
  return state.data.exercises.find((exercise) => exercise.id === id)?.name || "Missing exercise";
}

function exerciseDetails(id) {
  const exercise = state.data.exercises.find((item) => item.id === id);
  return exercise ? `${exercise.category} · ${exercise.targetSets} sets · ${exercise.repMin}-${exercise.repMax} reps` : "";
}

function exerciseInsights(exerciseId) {
  const rows = historyForExercise(state.data, exerciseId);
  const recent = rows.slice(-3).map(({ exercise }) => setStats(exercise));
  let trend = "holding";
  if (recent.length >= 3) {
    if (recent.at(-1).volume > recent.at(0).volume) trend = "improving";
    if (recent.at(-1).volume < recent.at(0).volume * 0.92) trend = "dropping";
  }
  const latest = rows.at(-1)?.exercise;
  if (latest?.recommendation?.label === "Stalled") trend = "stalled";
  return trend;
}

function trendList(type) {
  return state.data.exercises
    .map((exercise) => ({ id: exercise.id, name: exercise.name, trend: exerciseInsights(exercise.id) }))
    .filter((item) => item.trend === type);
}

function trendCard(item) {
  return `<div class="card workout-card"><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.trend)}</div></div>`;
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function openTemplateModal(template = null) {
  const isNew = !template;
  const t = template || { id: uid(), name: "", description: "", favorite: false, exerciseIds: [] };
  state.modal = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${isNew ? "New Workout" : "Edit Workout"}</h3>
        <div class="form">
          <div class="field"><label>Name</label><input data-modal-template-name value="${escapeHtml(t.name)}" /></div>
          <div class="field"><label>Description</label><textarea data-modal-template-description>${escapeHtml(t.description || "")}</textarea></div>
          <label class="btn ghost" style="justify-content:flex-start"><input type="checkbox" data-modal-template-favorite ${t.favorite ? "checked" : ""} style="width:auto;min-height:auto"> Favorite</label>
          <div class="actions">
            <button class="btn primary" data-save-template="${t.id}" data-is-new="${isNew}">Save</button>
            <button class="btn ghost" data-close-modal>Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
  render();
}

function openExerciseModal(exercise = null, draftIndex = null, addToDraft = false) {
  const isNew = !exercise;
  const e = exercise || makeExercise("", "", 3, 8, 10, 0, 5, "");
  state.modal = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${isNew ? "New Exercise" : "Edit Exercise"}</h3>
        <div class="form">
          <div class="form-grid">
            <div class="field"><label>Exercise name</label><input data-ex-name value="${escapeHtml(e.name)}" /></div>
            <div class="field"><label>Category/body part</label><input data-ex-category value="${escapeHtml(e.category)}" /></div>
            <div class="field"><label>Target sets</label><input type="number" min="1" step="1" data-ex-sets value="${e.targetSets}" /></div>
            <div class="field"><label>Rep range</label><input data-ex-reps value="${e.repMin}-${e.repMax}" placeholder="8-10" /></div>
            <div class="field"><label>Starting weight</label><input type="number" min="0" step="0.5" data-ex-weight value="${e.defaultWeight}" /></div>
            <div class="field"><label>Weight increment</label><input type="number" min="0.5" step="0.5" data-ex-increment value="${e.increment}" /></div>
          </div>
          <div class="field"><label>Notes</label><textarea data-ex-notes>${escapeHtml(e.notes || "")}</textarea></div>
          <div class="actions">
            <button class="btn primary" data-save-exercise="${e.id}" data-is-new="${isNew}" data-draft-index="${draftIndex ?? ""}" data-add-to-draft="${addToDraft}">Save</button>
            <button class="btn ghost" data-close-modal>Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
  render();
}
