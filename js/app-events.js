function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => navTo(el.dataset.nav)));
  document.querySelector("[data-auth-email]")?.addEventListener("input", (event) => state.auth.email = event.target.value);
  document.querySelector("[data-sign-in]")?.addEventListener("click", signInWithEmail);
  document.querySelector("[data-sign-out]")?.addEventListener("click", signOut);
  document.querySelector("[data-upload-local]")?.addEventListener("click", uploadLocalToCloud);
  document.querySelector("[data-load-cloud]")?.addEventListener("click", hydrateFromCloud);
  document.querySelectorAll("[data-export]").forEach((el) => el.addEventListener("click", exportData));
  document.querySelectorAll("[data-start-blank]").forEach((el) => el.addEventListener("click", () => { state.draftWorkout = blankDraft(); state.view = "today"; render(); }));
  document.querySelectorAll("[data-use-template]").forEach((el) => el.addEventListener("click", () => { state.draftWorkout = buildDraftFromTemplate(el.dataset.useTemplate); state.view = "today"; render(); }));
  document.querySelectorAll("[data-copy-session]").forEach((el) => el.addEventListener("click", () => { state.draftWorkout = buildDraftFromSession(el.dataset.copySession, "copy"); state.view = "today"; render(); }));
  document.querySelectorAll("[data-edit-session]").forEach((el) => el.addEventListener("click", () => { state.draftWorkout = buildDraftFromSession(el.dataset.editSession, "edit"); state.view = "today"; render(); }));
  document.querySelectorAll("[data-delete-session]").forEach((el) => el.addEventListener("click", () => {
    if (confirm("Delete this logged workout?")) updateData((data) => data.sessions = data.sessions.filter((session) => session.id !== el.dataset.deleteSession));
  }));
  document.querySelectorAll("[data-favorite-session]").forEach((el) => el.addEventListener("click", () => updateData((data) => {
    const session = data.sessions.find((item) => item.id === el.dataset.favoriteSession);
    session.favorite = !session.favorite;
  })));
  document.querySelector("[data-draft-name]")?.addEventListener("input", (event) => state.draftWorkout.workoutName = event.target.value);
  document.querySelector("[data-draft-date]")?.addEventListener("input", (event) => state.draftWorkout.date = event.target.value);
  document.querySelector("[data-draft-notes]")?.addEventListener("input", (event) => state.draftWorkout.notes = event.target.value);
  document.querySelector("[data-add-selected-exercise]")?.addEventListener("click", () => {
    const picker = document.querySelector("[data-add-existing]");
    if (!picker?.value) return;
    addExerciseToDraft(picker.value);
    render();
  });
  document.querySelector("[data-template-picker]")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.draftWorkout = buildDraftFromTemplate(event.target.value);
    render();
  });
  document.querySelector("[data-session-picker]")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.draftWorkout = buildDraftFromSession(event.target.value, "copy");
    render();
  });
  document.querySelector("[data-clear-draft]")?.addEventListener("click", () => { state.draftWorkout = blankDraft(); render(); });
  document.querySelector("[data-new-exercise-to-draft]")?.addEventListener("click", () => openExerciseModal(null, null, true));
  document.querySelectorAll("[data-add-exercise-direct]").forEach((el) => el.addEventListener("click", () => { addExerciseToDraft(el.dataset.addExerciseDirect); state.view = "today"; render(); }));
  document.querySelectorAll("[data-set-weight]").forEach((el) => el.addEventListener("input", () => setDraftValue(el.dataset.setWeight, "weight", el.value)));
  document.querySelectorAll("[data-set-reps]").forEach((el) => el.addEventListener("input", () => setDraftValue(el.dataset.setReps, "reps", el.value)));
  document.querySelectorAll("[data-entry-notes]").forEach((el) => el.addEventListener("input", () => state.draftWorkout.exercises[Number(el.dataset.entryNotes)].notes = el.value));
  document.querySelectorAll("[data-remove-draft-exercise]").forEach((el) => el.addEventListener("click", () => { state.draftWorkout.exercises.splice(Number(el.dataset.removeDraftExercise), 1); render(); }));
  document.querySelectorAll("[data-edit-draft-exercise]").forEach((el) => el.addEventListener("click", () => openDraftExerciseModal(Number(el.dataset.editDraftExercise))));
  document.querySelectorAll("[data-same-last]").forEach((el) => el.addEventListener("click", () => sameAsLast(Number(el.dataset.sameLast))));
  document.querySelectorAll("[data-inc-weight]").forEach((el) => el.addEventListener("click", () => adjustWeight(Number(el.dataset.incWeight), 1)));
  document.querySelectorAll("[data-dec-weight]").forEach((el) => el.addEventListener("click", () => adjustWeight(Number(el.dataset.decWeight), -1)));
  document.querySelectorAll("[data-add-set]").forEach((el) => el.addEventListener("click", () => addSet(Number(el.dataset.addSet))));
  document.querySelectorAll("[data-remove-set]").forEach((el) => el.addEventListener("click", () => removeSet(Number(el.dataset.removeSet))));
  document.querySelectorAll("[data-delete-set]").forEach((el) => el.addEventListener("click", () => deleteSet(el.dataset.deleteSet)));
  document.querySelectorAll("[data-save-workout]").forEach((el) => el.addEventListener("click", saveWorkout));
  document.querySelector("[data-new-template]")?.addEventListener("click", () => openTemplateModal());
  document.querySelectorAll("[data-edit-template]").forEach((el) => el.addEventListener("click", () => openTemplateModal(state.data.templates.find((template) => template.id === el.dataset.editTemplate))));
  document.querySelectorAll("[data-duplicate-template]").forEach((el) => el.addEventListener("click", () => updateData((data) => {
    const template = data.templates.find((item) => item.id === el.dataset.duplicateTemplate);
    data.templates.push({ ...structuredClone(template), id: uid(), name: `${template.name} Copy`, favorite: false });
  })));
  document.querySelectorAll("[data-favorite-template]").forEach((el) => el.addEventListener("click", () => updateData((data) => {
    const template = data.templates.find((item) => item.id === el.dataset.favoriteTemplate);
    template.favorite = !template.favorite;
  })));
  document.querySelectorAll("[data-delete-template]").forEach((el) => el.addEventListener("click", () => {
    if (confirm("Delete this saved workout?")) updateData((data) => data.templates = data.templates.filter((template) => template.id !== el.dataset.deleteTemplate));
  }));
  document.querySelectorAll("[data-move-template]").forEach((el) => el.addEventListener("click", () => moveItem(state.data.templates, el.dataset.moveTemplate, Number(el.dataset.dir))));
  document.querySelectorAll("[data-template-add-exercise]").forEach((el) => el.addEventListener("change", () => {
    if (!el.value) return;
    updateData((data) => data.templates.find((template) => template.id === el.dataset.templateAddExercise).exerciseIds.push(el.value));
  }));
  document.querySelectorAll("[data-remove-template-exercise]").forEach((el) => el.addEventListener("click", () => {
    const [templateId, exerciseId] = el.dataset.removeTemplateExercise.split(":");
    updateData((data) => {
      const template = data.templates.find((item) => item.id === templateId);
      template.exerciseIds = template.exerciseIds.filter((id) => id !== exerciseId);
    });
  }));
  document.querySelectorAll("[data-move-template-exercise]").forEach((el) => el.addEventListener("click", () => {
    const [templateId, exerciseId] = el.dataset.moveTemplateExercise.split(":");
    const template = state.data.templates.find((item) => item.id === templateId);
    moveId(template.exerciseIds, exerciseId, Number(el.dataset.dir));
  }));
  document.querySelector("[data-new-exercise]")?.addEventListener("click", () => openExerciseModal());
  document.querySelectorAll("[data-edit-exercise]").forEach((el) => el.addEventListener("click", () => openExerciseModal(state.data.exercises.find((exercise) => exercise.id === el.dataset.editExercise))));
  document.querySelectorAll("[data-delete-exercise]").forEach((el) => el.addEventListener("click", () => deleteLibraryExercise(el.dataset.deleteExercise)));
  document.querySelector("[data-close-modal]")?.addEventListener("click", () => { state.modal = null; render(); });
  document.querySelector("[data-save-template]")?.addEventListener("click", saveTemplateFromModal);
  document.querySelector("[data-save-exercise]")?.addEventListener("click", saveExerciseFromModal);
  addImportExportControls();
}

function addExerciseToDraft(exerciseId) {
  if (!state.draftWorkout) state.draftWorkout = blankDraft();
  const entry = draftEntryFromExerciseId(exerciseId);
  if (entry) state.draftWorkout.exercises.push(entry);
}

function openDraftExerciseModal(index) {
  const entry = state.draftWorkout.exercises[index];
  const exercise = {
    id: entry.exerciseId,
    name: entry.name,
    category: entry.category,
    targetSets: entry.targetSets,
    repMin: entry.repMin,
    repMax: entry.repMax,
    defaultWeight: entry.sets?.[0]?.weight || 0,
    increment: entry.increment,
    notes: entry.notes || "",
  };
  openExerciseModal(exercise, index, false);
}

function setDraftValue(path, key, value) {
  const [exerciseIndex, setIndex] = path.split(":").map(Number);
  state.draftWorkout.exercises[exerciseIndex].sets[setIndex][key] = value;
}

function sameAsLast(index) {
  const entry = state.draftWorkout.exercises[index];
  const last = historyForExercise(state.data, entry.exerciseId).at(-1);
  if (!last) return;
  entry.sets = setStats(last.exercise).sets.map((set) => ({ weight: set.weight, reps: set.reps }));
  render();
}

function adjustWeight(index, direction) {
  const entry = state.draftWorkout.exercises[index];
  entry.sets.forEach((set) => set.weight = Math.max(0, Number(set.weight || 0) + direction * Number(entry.increment || 5)));
  render();
}

function addSet(index) {
  const entry = state.draftWorkout.exercises[index];
  const last = entry.sets.at(-1) || { weight: 0, reps: "" };
  entry.sets.push({ weight: last.weight, reps: "" });
  render();
}

function removeSet(index) {
  const entry = state.draftWorkout.exercises[index];
  if (entry.sets.length > 1) entry.sets.pop();
  render();
}

function deleteSet(path) {
  const [exerciseIndex, setIndex] = path.split(":").map(Number);
  const sets = state.draftWorkout.exercises[exerciseIndex].sets;
  if (sets.length > 1) sets.splice(setIndex, 1);
  render();
}

function saveWorkout() {
  const workout = structuredClone(state.draftWorkout || blankDraft());
  workout.workoutName = workout.workoutName.trim() || "Workout";
  workout.date ||= todayISO();
  workout.exercises = workout.exercises
    .map((entry) => ({
      ...entry,
      sets: (entry.sets || []).map((set) => ({ weight: Number(set.weight || 0), reps: Number(set.reps || 0) })).filter((set) => set.weight > 0 || set.reps > 0),
    }))
    .filter((entry) => entry.sets.length);
  workout.exercises.forEach((entry) => entry.recommendation = recommendAfter(entry, historyForExercise(state.data, entry.exerciseId, workout.id)));
  updateData((data) => {
    if (workout.id) {
      const index = data.sessions.findIndex((session) => session.id === workout.id);
      if (index >= 0) data.sessions[index] = workout;
    } else {
      workout.id = uid();
      data.sessions.push(workout);
    }
  });
  state.draftWorkout = null;
  state.view = "history";
  render();
}

function saveTemplateFromModal(event) {
  const id = event.target.dataset.saveTemplate;
  const isNew = event.target.dataset.isNew === "true";
  const name = document.querySelector("[data-modal-template-name]").value.trim() || "Untitled Workout";
  const description = document.querySelector("[data-modal-template-description]").value.trim();
  const favorite = document.querySelector("[data-modal-template-favorite]").checked;
  state.modal = null;
  updateData((data) => {
    if (isNew) data.templates.push({ id, name, description, favorite, exerciseIds: [] });
    else {
      const template = data.templates.find((item) => item.id === id);
      template.name = name;
      template.description = description;
      template.favorite = favorite;
    }
  });
}

function saveExerciseFromModal(event) {
  const id = event.target.dataset.saveExercise;
  const isNew = event.target.dataset.isNew === "true";
  const draftIndex = event.target.dataset.draftIndex === "" ? null : Number(event.target.dataset.draftIndex);
  const addToDraft = event.target.dataset.addToDraft === "true";
  const [repMin, repMax] = document.querySelector("[data-ex-reps]").value.split(/[-–]/).map((n) => Number(n.trim()));
  const exercise = {
    id,
    name: document.querySelector("[data-ex-name]").value.trim() || "Untitled Exercise",
    category: document.querySelector("[data-ex-category]").value.trim() || "Other",
    targetSets: Number(document.querySelector("[data-ex-sets]").value || 3),
    repMin: repMin || 8,
    repMax: repMax || repMin || 10,
    defaultWeight: Number(document.querySelector("[data-ex-weight]").value || 0),
    increment: Number(document.querySelector("[data-ex-increment]").value || 5),
    notes: document.querySelector("[data-ex-notes]").value.trim(),
  };
  state.modal = null;
  updateData((data) => {
    if (isNew) data.exercises.push(exercise);
    else {
      const index = data.exercises.findIndex((item) => item.id === id);
      if (index >= 0) data.exercises[index] = exercise;
    }
  });
  if (draftIndex !== null) {
    const entry = state.draftWorkout.exercises[draftIndex];
    Object.assign(entry, {
      exerciseId: exercise.id,
      name: exercise.name,
      category: exercise.category,
      targetSets: exercise.targetSets,
      repMin: exercise.repMin,
      repMax: exercise.repMax,
      increment: exercise.increment,
      notes: exercise.notes,
    });
    saveData(state.data);
  }
  if (addToDraft) addExerciseToDraft(exercise.id);
  render();
}

function deleteLibraryExercise(exerciseId) {
  const used = state.data.sessions.some((session) => session.exercises.some((entry) => entry.exerciseId === exerciseId));
  const message = used ? "This exercise has logged history. Delete it from the exercise list anyway? Past workouts will keep their saved entries." : "Delete this exercise?";
  if (!confirm(message)) return;
  updateData((data) => {
    data.exercises = data.exercises.filter((exercise) => exercise.id !== exerciseId);
    data.templates.forEach((template) => template.exerciseIds = template.exerciseIds.filter((id) => id !== exerciseId));
  });
}

function moveItem(items, id, dir) {
  const index = items.findIndex((item) => item.id === id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
  saveData(state.data);
  render();
}

function moveId(ids, id, dir) {
  const index = ids.findIndex((item) => item === id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= ids.length) return;
  [ids[index], ids[next]] = [ids[next], ids[index]];
  saveData(state.data);
  render();
}

function addImportExportControls() {
  const main = document.querySelector(".main");
  if (!main || state.view !== "dashboard") return;
  const tools = document.createElement("div");
  tools.className = "section actions";
  tools.innerHTML = `<button class="btn ghost" data-export>Export JSON</button><label class="btn ghost">Import JSON<input type="file" accept="application/json" data-import hidden></label>`;
  main.appendChild(tools);
  tools.querySelector("[data-export]").addEventListener("click", exportData);
  tools.querySelector("[data-import]").addEventListener("change", importData);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gym-progression-tracker-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = normalizeData(JSON.parse(reader.result));
      state.data = data;
      saveData(state.data);
      state.draftWorkout = null;
      render();
    } catch {
      alert("That JSON file does not look like a Gym Progression Tracker backup.");
    }
  };
  reader.readAsText(file);
}

function render() {
  const views = {
    dashboard: dashboardView,
    today: todayView,
    templates: templatesView,
    history: historyView,
  };
  document.getElementById("app").innerHTML = (views[state.view] || dashboardView)();
  bindEvents();
}

window.addEventListener("online", () => flushCloudSync({ rerender: true }));
render();
initAuthAndSync();
