const STORAGE_KEY = "gym-progression-tracker:v2";
const OLD_STORAGE_KEY = "gym-progression-tracker:v1";
const PENDING_SYNC_KEY = "gym-progression-tracker:pending-sync";
const LAST_CLOUD_SYNC_KEY = "gym-progression-tracker:last-cloud-sync";
const LOCAL_MIGRATION_KEY = "gym-progression-tracker:local-migration-uploaded";
const SYNC_TABLES = {
  exercises: "exercises",
  templates: "workout_templates",
  sessions: "workout_sessions",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtWeight = (n) => `${fmtNum(n)} lb`;
const sum = (arr) => arr.reduce((total, n) => total + Number(n || 0), 0);

function makeExercise(name, category, targetSets, repMin, repMax, defaultWeight, increment, notes = "") {
  return { id: uid(), name, category, targetSets, repMin, repMax, defaultWeight, increment, notes };
}

function sampleData() {
  const exercises = [
    makeExercise("Back Squat", "Legs", 3, 6, 8, 135, 5, "Brace hard. Keep the first rep calm."),
    makeExercise("Romanian Deadlift", "Hamstrings", 3, 8, 10, 115, 5, "Soft knees, hips back, slow lowering."),
    makeExercise("Seated Dumbbell Press", "Shoulders", 3, 8, 10, 35, 5, "Seat one notch back."),
    makeExercise("Cable Lateral Raise", "Shoulders", 3, 12, 15, 15, 2.5, "Lead with elbows."),
    makeExercise("Lat Pulldown", "Back", 3, 10, 12, 110, 5, "Medium neutral grip if available."),
    makeExercise("Chest-Supported Row", "Back", 3, 8, 10, 90, 5, "Pause at the top."),
    makeExercise("Face Pull", "Rear Delts", 3, 12, 15, 35, 5, "Pull toward forehead."),
    makeExercise("EZ-Bar Curl", "Biceps", 3, 8, 10, 50, 5, "No hip swing."),
    makeExercise("Bench Press", "Chest", 3, 6, 8, 135, 5, "Shoulder blades set before unrack."),
    makeExercise("Incline Dumbbell Press", "Chest", 3, 8, 10, 45, 5, "Slight pause at bottom."),
    makeExercise("Cable Fly", "Chest", 3, 10, 12, 25, 2.5, "Stop before shoulders roll forward."),
    makeExercise("Rope Pressdown", "Triceps", 3, 10, 12, 45, 5, "Lock out cleanly."),
    makeExercise("Goblet Squat", "Legs", 3, 10, 12, 55, 5, "Keep elbows inside knees."),
    makeExercise("Machine Row", "Back", 3, 10, 12, 100, 5, "Chest tall."),
    makeExercise("Dumbbell Bench Press", "Chest", 3, 8, 10, 50, 5, "Match left and right depth."),
    makeExercise("Leg Curl", "Hamstrings", 3, 10, 12, 70, 5, "Control the return."),
  ];
  const byName = (name) => exercises.find((exercise) => exercise.name === name).id;
  const templates = [
    { id: uid(), name: "Legs + Shoulders", description: "Squat pattern, single-leg work, presses, and lateral raises.", favorite: true, exerciseIds: [byName("Back Squat"), byName("Romanian Deadlift"), byName("Seated Dumbbell Press"), byName("Cable Lateral Raise")] },
    { id: uid(), name: "Back + Biceps", description: "Pull, row, rear delts, curls.", favorite: true, exerciseIds: [byName("Lat Pulldown"), byName("Chest-Supported Row"), byName("Face Pull"), byName("EZ-Bar Curl")] },
    { id: uid(), name: "Chest + Triceps", description: "Pressing and simple triceps work.", favorite: true, exerciseIds: [byName("Bench Press"), byName("Incline Dumbbell Press"), byName("Cable Fly"), byName("Rope Pressdown")] },
    { id: uid(), name: "Full Body", description: "Fast session for busy days.", favorite: false, exerciseIds: [byName("Goblet Squat"), byName("Machine Row"), byName("Dumbbell Bench Press"), byName("Leg Curl")] },
  ];

  const sessions = [];
  const addSession = (daysAgo, workoutName, logs) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    sessions.push({
      id: uid(),
      date: date.toISOString().slice(0, 10),
      workoutName,
      favorite: false,
      notes: "",
      exercises: logs.map((log) => {
        const exercise = exercises.find((item) => item.name === log.name);
        return buildLoggedExercise(exercise, log.reps.map((reps) => ({ weight: log.weight, reps })), log.notes || "");
      }),
    });
  };

  addSession(20, "Chest + Triceps", [{ name: "Bench Press", weight: 130, reps: [8, 8, 7] }, { name: "Incline Dumbbell Press", weight: 45, reps: [9, 8, 8] }]);
  addSession(13, "Chest + Triceps", [{ name: "Bench Press", weight: 135, reps: [7, 7, 6] }, { name: "Rope Pressdown", weight: 45, reps: [12, 12, 10] }]);
  addSession(6, "Chest + Triceps", [{ name: "Bench Press", weight: 135, reps: [8, 8, 7], notes: "Felt steadier." }, { name: "Cable Fly", weight: 25, reps: [12, 11, 10] }]);
  addSession(11, "Back + Biceps", [{ name: "Lat Pulldown", weight: 110, reps: [12, 11, 10] }, { name: "EZ-Bar Curl", weight: 50, reps: [10, 9, 8] }]);
  addSession(4, "Back + Biceps", [{ name: "Lat Pulldown", weight: 110, reps: [12, 12, 11] }, { name: "Chest-Supported Row", weight: 90, reps: [10, 10, 9] }]);
  addSession(2, "Legs + Shoulders", [{ name: "Seated Dumbbell Press", weight: 45, reps: [7, 7, 6] }, { name: "Back Squat", weight: 135, reps: [8, 8, 7] }]);

  const data = { exercises, templates, sessions };
  recalculateRecommendations(data);
  return data;
}

function buildLoggedExercise(exercise, sets = [], notes = "") {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    category: exercise.category,
    targetSets: Number(exercise.targetSets),
    repMin: Number(exercise.repMin),
    repMax: Number(exercise.repMax),
    increment: Number(exercise.increment),
    notes,
    sets,
    recommendation: null,
  };
}

function migrateOldData(oldData) {
  if (!oldData?.templates || !oldData?.sessions) return sampleData();
  const exerciseById = new Map();
  const exercises = [];
  oldData.templates.forEach((template) => {
    (template.exercises || []).forEach((exercise) => {
      if (!exerciseById.has(exercise.id)) {
        const next = {
          id: exercise.id || uid(),
          name: exercise.name || "Untitled Exercise",
          category: exercise.category || "Other",
          targetSets: Number(exercise.targetSets || 3),
          repMin: Number(exercise.repMin || 8),
          repMax: Number(exercise.repMax || 10),
          defaultWeight: Number(exercise.defaultWeight || 0),
          increment: Number(exercise.increment || 5),
          notes: exercise.notes || "",
        };
        exerciseById.set(next.id, next);
        exercises.push(next);
      }
    });
  });
  oldData.sessions.forEach((session) => {
    (session.exercises || []).forEach((entry) => {
      if (!exerciseById.has(entry.exerciseId)) {
        const next = {
          id: entry.exerciseId || uid(),
          name: entry.name || "Untitled Exercise",
          category: entry.category || "Other",
          targetSets: Number(entry.targetSets || 3),
          repMin: Number(entry.repMin || 8),
          repMax: Number(entry.repMax || 10),
          defaultWeight: Number(entry.sets?.[0]?.weight || 0),
          increment: Number(entry.increment || 5),
          notes: "",
        };
        exerciseById.set(next.id, next);
        exercises.push(next);
      }
    });
  });
  const templates = oldData.templates.map((template) => ({
    id: template.id || uid(),
    name: template.name || "Untitled Workout",
    description: template.description || "",
    favorite: Boolean(template.favorite),
    exerciseIds: (template.exercises || []).map((exercise) => exercise.id).filter(Boolean),
  }));
  const sessions = oldData.sessions.map((session) => ({
    id: session.id || uid(),
    date: session.date || todayISO(),
    workoutName: session.workoutName || "Workout",
    favorite: Boolean(session.favorite),
    notes: session.notes || "",
    exercises: (session.exercises || []).map((entry) => ({ ...entry, skipped: undefined })),
  }));
  const data = { exercises, templates, sessions };
  recalculateRecommendations(data);
  return data;
}

function loadLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return normalizeData(data);
    } catch {
      return sampleData();
    }
  }
  const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldRaw) {
    try {
      const data = migrateOldData(JSON.parse(oldRaw));
      saveLocalData(data);
      return data;
    } catch {
      const data = sampleData();
      saveLocalData(data);
      return data;
    }
  }
  const data = sampleData();
  saveLocalData(data);
  return data;
}

function normalizeData(data, options = {}) {
  const next = {
    exercises: Array.isArray(data.exercises) ? data.exercises : [],
    templates: Array.isArray(data.templates) ? data.templates : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  };
  next.templates.forEach((template) => {
    template.exerciseIds ||= (template.exercises || []).map((exercise) => exercise.id || exercise.exerciseId).filter(Boolean);
    delete template.exercises;
    template.favorite = Boolean(template.favorite);
  });
  next.sessions.forEach((session) => {
    session.favorite = Boolean(session.favorite);
    session.notes ||= "";
  });
  if (!next.exercises.length && !options.allowEmpty) return sampleData();
  recalculateRecommendations(next);
  return next;
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function localDataExists() {
  return Boolean(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY));
}

function supabaseConfig() {
  return window.GYM_TRACKER_CONFIG || {};
}

function hasSupabaseConfig() {
  const config = supabaseConfig();
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
}

let supabaseClient = null;

function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!supabaseClient) {
    const config = supabaseConfig();
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabaseClient;
}

function markPendingSync(pending) {
  state.sync.pending = pending;
  if (pending) localStorage.setItem(PENDING_SYNC_KEY, "true");
  else localStorage.removeItem(PENDING_SYNC_KEY);
}

function setSyncStatus(status, message) {
  state.sync.status = status;
  state.sync.message = message;
}

function toExerciseRow(exercise, userId) {
  return {
    id: exercise.id,
    user_id: userId,
    name: exercise.name,
    category: exercise.category,
    target_sets: Number(exercise.targetSets || 3),
    rep_min: Number(exercise.repMin || 8),
    rep_max: Number(exercise.repMax || 10),
    default_weight: Number(exercise.defaultWeight || 0),
    increment: Number(exercise.increment || 5),
    notes: exercise.notes || "",
    updated_at: new Date().toISOString(),
  };
}

function fromExerciseRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "Other",
    targetSets: Number(row.target_sets || 3),
    repMin: Number(row.rep_min || 8),
    repMax: Number(row.rep_max || 10),
    defaultWeight: Number(row.default_weight || 0),
    increment: Number(row.increment || 5),
    notes: row.notes || "",
  };
}

function toTemplateRow(template, userId) {
  return {
    id: template.id,
    user_id: userId,
    name: template.name,
    description: template.description || "",
    favorite: Boolean(template.favorite),
    exercise_ids: template.exerciseIds || [],
    updated_at: new Date().toISOString(),
  };
}

function fromTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    favorite: Boolean(row.favorite),
    exerciseIds: Array.isArray(row.exercise_ids) ? row.exercise_ids : [],
  };
}

function toSessionRow(session, userId) {
  return {
    id: session.id,
    user_id: userId,
    workout_name: session.workoutName,
    workout_date: session.date,
    favorite: Boolean(session.favorite),
    notes: session.notes || "",
    exercises: session.exercises || [],
    updated_at: new Date().toISOString(),
  };
}

function fromSessionRow(row) {
  return {
    id: row.id,
    date: row.workout_date,
    workoutName: row.workout_name,
    favorite: Boolean(row.favorite),
    notes: row.notes || "",
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
  };
}

async function loadCloudData() {
  const client = getSupabaseClient();
  const user = state.auth.user;
  if (!client || !user) throw new Error("Sign in before loading cloud data.");
  const [exerciseResult, templateResult, sessionResult] = await Promise.all([
    client.from(SYNC_TABLES.exercises).select("*").order("name", { ascending: true }),
    client.from(SYNC_TABLES.templates).select("*").order("created_at", { ascending: true }),
    client.from(SYNC_TABLES.sessions).select("*").order("workout_date", { ascending: false }),
  ]);
  const error = exerciseResult.error || templateResult.error || sessionResult.error;
  if (error) throw error;
  const data = normalizeData({
    exercises: (exerciseResult.data || []).map(fromExerciseRow),
    templates: (templateResult.data || []).map(fromTemplateRow),
    sessions: (sessionResult.data || []).map(fromSessionRow),
  }, { allowEmpty: true });
  return data;
}

async function replaceTableRows(table, rows, ids) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data: existing, error: selectError } = await client.from(table).select("id");
  if (selectError) throw selectError;
  const keep = new Set(ids);
  const deleteIds = (existing || []).map((row) => row.id).filter((id) => !keep.has(id));
  if (deleteIds.length) {
    const { error: deleteError } = await client.from(table).delete().in("id", deleteIds);
    if (deleteError) throw deleteError;
  }
  if (rows.length) {
    const { error: upsertError } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }
}

async function saveCloudData(data) {
  const user = state.auth.user;
  if (!getSupabaseClient() || !user) return;
  await replaceTableRows(SYNC_TABLES.exercises, data.exercises.map((exercise) => toExerciseRow(exercise, user.id)), data.exercises.map((exercise) => exercise.id));
  await replaceTableRows(SYNC_TABLES.templates, data.templates.map((template) => toTemplateRow(template, user.id)), data.templates.map((template) => template.id));
  await replaceTableRows(SYNC_TABLES.sessions, data.sessions.map((session) => toSessionRow(session, user.id)), data.sessions.map((session) => session.id));
  const now = new Date().toLocaleString();
  state.sync.lastCloudSync = now;
  localStorage.setItem(LAST_CLOUD_SYNC_KEY, now);
  markPendingSync(false);
}

async function flushCloudSync({ rerender = false } = {}) {
  if (!state.auth.user || !hasSupabaseConfig() || state.sync.busy) return;
  state.sync.busy = true;
  setSyncStatus("syncing", "Syncing to cloud...");
  if (rerender) render();
  try {
    await saveCloudData(state.data);
    setSyncStatus("cloud", `Cloud saved${state.sync.lastCloudSync ? ` ${state.sync.lastCloudSync}` : ""}`);
  } catch (error) {
    console.error(error);
    markPendingSync(true);
    setSyncStatus("offline", "Saved locally. Cloud sync will retry when online.");
  } finally {
    state.sync.busy = false;
    if (rerender) render();
  }
}

function saveData(data) {
  saveLocalData(data);
  if (state.auth.user && hasSupabaseConfig()) {
    markPendingSync(true);
    setSyncStatus("syncing", "Saved locally. Cloud sync queued...");
    flushCloudSync();
  } else if (hasSupabaseConfig()) {
    setSyncStatus("local", "Saved on this device. Sign in to sync.");
  } else {
    setSyncStatus("local", "Saved on this device. Add Supabase config to sync.");
  }
}

let state = {
  data: loadLocalData(),
  localStartupData: null,
  view: "dashboard",
  modal: null,
  draftWorkout: null,
  auth: {
    ready: false,
    enabled: false,
    user: null,
    email: "",
    message: "",
  },
  sync: {
    status: "local",
    message: "Saved on this device",
    pending: localStorage.getItem(PENDING_SYNC_KEY) === "true",
    lastCloudSync: localStorage.getItem(LAST_CLOUD_SYNC_KEY) || "",
    busy: false,
    cloudHadData: false,
  },
};
