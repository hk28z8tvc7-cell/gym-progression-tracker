function blankDraft() {
  return { id: null, source: "blank", date: todayISO(), workoutName: "Today's Workout", favorite: false, notes: "", exercises: [] };
}

function buildDraftFromTemplate(templateId) {
  const template = state.data.templates.find((item) => item.id === templateId);
  const draft = blankDraft();
  draft.workoutName = template?.name || "Today's Workout";
  draft.source = "template";
  draft.templateId = template?.id || null;
  draft.exercises = (template?.exerciseIds || []).map((id) => draftEntryFromExerciseId(id)).filter(Boolean);
  return draft;
}

function buildDraftFromSession(sessionId, mode = "copy") {
  const session = state.data.sessions.find((item) => item.id === sessionId);
  if (!session) return blankDraft();
  return {
    id: mode === "edit" ? session.id : null,
    source: mode,
    date: mode === "edit" ? session.date : todayISO(),
    workoutName: session.workoutName,
    favorite: Boolean(session.favorite),
    notes: session.notes || "",
    exercises: session.exercises.map((entry) => ({
      ...structuredClone(entry),
      sets: mode === "edit" ? structuredClone(entry.sets || []) : (entry.sets || []).map((set) => ({ weight: set.weight, reps: "" })),
    })),
  };
}

function draftEntryFromExerciseId(exerciseId) {
  const exercise = state.data.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return null;
  const suggestion = suggestionForToday(exercise);
  return buildLoggedExercise(
    exercise,
    Array.from({ length: Number(exercise.targetSets || 3) }, () => ({ weight: suggestion.weight, reps: "" })),
    ""
  );
}

function setStats(entry) {
  const sets = (entry.sets || []).filter((set) => Number(set.reps) > 0 && Number(set.weight) > 0);
  const reps = sets.map((set) => Number(set.reps));
  const weight = sets.length ? Number(sets.at(-1).weight) : 0;
  const totalReps = sum(reps);
  const volume = sets.reduce((total, set) => total + Number(set.weight || 0) * Number(set.reps || 0), 0);
  return { sets, reps, weight, totalReps, volume };
}

function historyForExercise(data, exerciseId, beforeSessionId = null) {
  const rows = [];
  data.sessions.forEach((session) => {
    if (beforeSessionId && session.id === beforeSessionId) return;
    session.exercises.forEach((exercise) => {
      if (exercise.exerciseId === exerciseId && setStats(exercise).sets.length) rows.push({ session, exercise });
    });
  });
  return rows.sort((a, b) => a.session.date.localeCompare(b.session.date));
}

function sameWeightHistory(history, weight) {
  return history
    .filter(({ exercise }) => Math.abs(setStats(exercise).weight - weight) < 0.001)
    .map(({ exercise }) => setStats(exercise).totalReps);
}

function recommendAfter(entry, previousHistory) {
  const stats = setStats(entry);
  const repMin = Number(entry.repMin || 0);
  const repMax = Number(entry.repMax || repMin);
  const targetSets = Number(entry.targetSets || stats.sets.length || 1);
  const increment = Number(entry.increment || 5);
  const reps = stats.reps;
  if (!stats.sets.length) return { label: "Skipped", nextWeight: Number(entry.sets?.[0]?.weight || 0), message: "No working sets logged." };
  const enoughSets = reps.length >= targetSets;
  const allTop = enoughSets && reps.slice(0, targetSets).every((rep) => rep >= repMax);
  const allInRange = enoughSets && reps.slice(0, targetSets).every((rep) => rep >= repMin && rep <= repMax);
  const badlyMissed = reps.length < Math.max(1, targetSets - 1) || reps.some((rep) => rep < Math.max(1, repMin - 2));
  const previousSameWeight = sameWeightHistory(previousHistory, stats.weight);
  const lastSame = previousSameWeight.at(-1);
  const dropped = typeof lastSame === "number" && stats.totalReps <= lastSame - 3;
  const recentSame = [...previousSameWeight, stats.totalReps].slice(-3);
  const stalled = recentSame.length >= 3 && recentSame.at(1) <= recentSame.at(0) && recentSame.at(2) <= recentSame.at(1);

  if (stalled) return { label: "Stalled", nextWeight: stats.weight, message: `Stalled at ${fmtWeight(stats.weight)}. Try repeating once more, lowering slightly and rebuilding, or using a smaller jump.` };
  if (allTop) {
    const next = stats.weight + increment;
    return { label: "Increase", nextWeight: next, message: `Increase to ${fmtWeight(next)} next time and aim for ${Array(targetSets).fill(repMin).join("/")}.` };
  }
  if (allInRange) return { label: "Hold", nextWeight: stats.weight, message: `Stay at ${fmtWeight(stats.weight)} and aim for ${Array(targetSets).fill(repMax).join("/")}.` };
  if (badlyMissed || dropped) {
    const lower = Math.max(0, stats.weight - increment);
    return { label: "Lower", nextWeight: lower, message: `Consider lowering to ${fmtWeight(lower)} or repeating ${fmtWeight(stats.weight)} with cleaner reps.` };
  }
  return { label: "Repeat", nextWeight: stats.weight, message: `Repeat ${fmtWeight(stats.weight)} and try to beat last time's ${stats.totalReps} total reps.` };
}

function recalculateRecommendations(data) {
  const sorted = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((session) => {
    session.exercises.forEach((entry) => {
      entry.recommendation = recommendAfter(entry, historyForExercise(data, entry.exerciseId, session.id).filter((row) => row.session.date <= session.date));
    });
  });
}

function suggestionForToday(exercise) {
  const history = historyForExercise(state.data, exercise.id);
  const last = history.at(-1);
  if (!last) {
    return {
      label: "Start",
      weight: Number(exercise.defaultWeight || 0),
      text: `No history yet. Start at ${fmtWeight(exercise.defaultWeight)} x ${Array(Number(exercise.targetSets || 3)).fill(exercise.repMin || 8).join("/")}.`,
    };
  }
  const recommendation = last.exercise.recommendation || recommendAfter(last.exercise, history.slice(0, -1));
  const stats = setStats(last.exercise);
  return {
    label: recommendation.label,
    weight: Number(recommendation.nextWeight || stats.weight),
    text: `Last: ${fmtWeight(stats.weight)} x ${stats.reps.join("/")}. Today: ${recommendation.message.replace(" next time", "").replace("Increase to", "try")}`,
  };
}

function allExerciseEntries() {
  return state.data.sessions.flatMap((session) => session.exercises.map((exercise) => ({ session, ...exercise, stats: setStats(exercise) })));
}

function dashboardView() {
  const sessions = sortedSessions();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthKey = todayISO().slice(0, 7);
  const weekCount = sessions.filter((session) => new Date(`${session.date}T00:00:00`) >= weekStart).length;
  const monthCount = sessions.filter((session) => session.date.startsWith(monthKey)).length;
  const favorites = state.data.templates.filter((template) => template.favorite).slice(0, 4);
  const recent = sessions.slice(0, 5);
  const improving = trendList("improving").slice(0, 4);
  const stalled = trendList("stalled").slice(0, 4);
  return appLayout(`
    <div class="topbar">
      <div>
        <h2>Today’s gym notebook</h2>
        <p>Start blank, use a favorite workout, or copy something you recently did. Exercises keep their own history either way.</p>
      </div>
      <button class="btn primary" data-start-blank>Start Blank</button>
    </div>
    <div class="grid cols-4">
      <div class="card metric"><span>This week</span><strong>${weekCount}</strong></div>
      <div class="card metric"><span>This month</span><strong>${monthCount}</strong></div>
      <div class="card metric"><span>Exercises</span><strong>${state.data.exercises.length}</strong></div>
      <div class="card metric"><span>Workouts logged</span><strong>${sessions.length}</strong></div>
    </div>
    <section class="section">
      <div class="section-title"><h3>Favorite Workouts</h3><button class="btn small ghost" data-nav="templates">Manage</button></div>
      <div class="grid cols-2">${favorites.length ? favorites.map(templateCard).join("") : empty("Favorite reusable workouts will appear here.")}</div>
    </section>
    <section class="section grid cols-2">
      <div>
        <div class="section-title"><h3>Recent Workouts</h3><button class="btn small ghost" data-nav="history">View All</button></div>
        <div class="grid">${recent.length ? recent.map((session) => sessionCard(session, true)).join("") : empty("Logged workouts will appear here.")}</div>
      </div>
      <div>
        <div class="section-title"><h3>Exercises To Watch</h3></div>
        <div class="grid">${[...stalled, ...improving].length ? [...stalled, ...improving].map(trendCard).join("") : empty("Progress notes will appear after a few logs.")}</div>
      </div>
    </section>
  `);
}

function sortedSessions() {
  return [...state.data.sessions].sort((a, b) => b.date.localeCompare(a.date));
}

function templateCard(template) {
  return `
    <div class="card template-card">
      <div class="template-head">
        <div>
          <h3>${escapeHtml(template.name)}${template.favorite ? " · Favorite" : ""}</h3>
          <p class="muted">${escapeHtml(template.description || "No description")}</p>
        </div>
        <button class="btn small primary" data-use-template="${template.id}">Use</button>
      </div>
      <div class="tag-row">
        <span class="tag">${template.exerciseIds.length} exercises</span>
        ${template.exerciseIds.slice(0, 4).map((id) => `<span class="tag">${escapeHtml(exerciseName(id))}</span>`).join("")}
      </div>
    </div>
  `;
}

function sessionCard(session, compact = false) {
  const volume = session.exercises.reduce((total, exercise) => total + setStats(exercise).volume, 0);
  return `
    <div class="card workout-card">
      <div class="template-head">
        <div>
          <strong>${escapeHtml(session.workoutName)}${session.favorite ? " · Favorite" : ""}</strong>
          <div class="muted">${session.date} · ${session.exercises.length} exercises · ${fmtNum(volume)} volume</div>
        </div>
        <div class="actions">
          <button class="btn small primary" data-copy-session="${session.id}">Copy</button>
          ${compact ? "" : `<button class="btn small" data-edit-session="${session.id}">Edit</button><button class="btn small ghost" data-favorite-session="${session.id}">${session.favorite ? "Unfavorite" : "Favorite"}</button><button class="btn small danger" data-delete-session="${session.id}">Delete</button>`}
        </div>
      </div>
      ${compact ? "" : `<div class="exercise-list">${session.exercises.map((exercise) => {
        const stats = setStats(exercise);
        return `<div class="compact-exercise"><div><strong>${escapeHtml(exercise.name)}</strong><div class="muted">${fmtWeight(stats.weight)} x ${stats.reps.join("/")} · ${exercise.recommendation?.label || ""}</div></div></div>`;
      }).join("")}</div>`}
    </div>
  `;
}
