state.localStartupData = structuredClone(state.data);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function updateData(mutator) {
  mutator(state.data);
  recalculateRecommendations(state.data);
  saveData(state.data);
  render();
}

function appLayout(content) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <h1>Gym Progression Tracker</h1>
          <p>Build today from exercises, favorites, or past workouts.</p>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "Home")}
          ${navButton("today", "Workout")}
          ${navButton("templates", "Workouts")}
          ${navButton("history", "History")}
        </nav>
      </aside>
      <main class="main">
        ${syncPanel()}
        ${content}
      </main>
    </div>
    ${state.modal || ""}
  `;
}

function syncPanel() {
  const configured = hasSupabaseConfig();
  const user = state.auth.user;
  const statusClass = state.sync.status === "offline" ? "lower" : state.sync.status === "cloud" ? "increase" : "hold";
  return `
    <section class="sync-panel card">
      <div>
        <strong>${user ? `Signed in as ${escapeHtml(user.email || "your account")}` : configured ? "Cloud sync available" : "Local-only mode"}</strong>
        <div class="muted">${escapeHtml(configured ? state.sync.message : "Add your Supabase project URL and publishable key in config.js to enable multi-device sync.")}</div>
      </div>
      <div class="actions sync-actions">
        <span class="tag ${statusClass}">${user ? (state.sync.pending ? "Pending sync" : "Cloud ready") : "Local"}</span>
        ${user ? `
          ${localDataExists() && localStorage.getItem(LOCAL_MIGRATION_KEY) !== user.id ? `<button class="btn small primary" data-upload-local>Upload This Device</button>` : ""}
          <button class="btn small ghost" data-load-cloud>Reload Cloud</button>
          <button class="btn small ghost" data-sign-out>Sign Out</button>
        ` : configured ? `
          <input class="auth-email" type="email" placeholder="email@example.com" data-auth-email value="${escapeHtml(state.auth.email)}" />
          <button class="btn small primary" data-sign-in>Email Login Link</button>
        ` : `
          <button class="btn small ghost" data-export>Export JSON</button>
        `}
      </div>
    </section>
  `;
}

function navButton(view, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-nav="${view}">${label}</button>`;
}

function navTo(view) {
  state.view = view;
  state.modal = null;
  if (view === "today" && !state.draftWorkout) state.draftWorkout = blankDraft();
  render();
}

async function initAuthAndSync() {
  state.auth.enabled = hasSupabaseConfig();
  if (!state.auth.enabled) {
    state.auth.ready = true;
    setSyncStatus("local", "Saved on this device. Add Supabase config to sync.");
    registerServiceWorker();
    render();
    return;
  }
  const client = getSupabaseClient();
  try {
    await handleAuthCallbackFromUrl(client);
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    state.auth.user = data.session?.user || null;
    state.auth.ready = true;
    client.auth.onAuthStateChange(async (_event, session) => {
      state.auth.user = session?.user || null;
      if (state.auth.user) await hydrateFromCloud();
      else {
        setSyncStatus("local", "Signed out. Saved on this device.");
        render();
      }
    });
    if (state.auth.user) await hydrateFromCloud();
    else {
      setSyncStatus("local", "Saved on this device. Sign in to sync.");
      render();
    }
  } catch (error) {
    console.error(error);
    state.auth.ready = true;
    setSyncStatus("offline", "Could not connect to Supabase. Saved locally for now.");
    render();
  }
  registerServiceWorker();
}

async function handleAuthCallbackFromUrl(client) {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const errorDescription = url.searchParams.get("error_description") || hash.get("error_description");
  if (errorDescription) {
    setSyncStatus("offline", errorDescription);
    cleanAuthUrl(url);
    return;
  }

  const tokenHash = url.searchParams.get("token_hash") || hash.get("token_hash");
  if (!tokenHash) return;
  const type = url.searchParams.get("type") || hash.get("type") || "email";
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
  cleanAuthUrl(url);
}

function cleanAuthUrl(url) {
  if (!window.history?.replaceState || window.location.protocol === "file:") return;
  window.history.replaceState({}, document.title, url.pathname);
}

async function hydrateFromCloud() {
  if (!state.auth.user) return;
  setSyncStatus("syncing", "Loading cloud data...");
  render();
  try {
    if (state.sync.pending && state.localStartupData) {
      state.data = normalizeData(structuredClone(state.localStartupData));
      await saveCloudData(state.data);
      saveLocalData(state.data);
      setSyncStatus("cloud", "Uploaded pending local changes.");
      render();
      return;
    }
    const cloudData = await loadCloudData();
    state.sync.cloudHadData = Boolean(cloudData.exercises.length || cloudData.templates.length || cloudData.sessions.length);
    if (state.sync.cloudHadData) {
      state.data = cloudData;
      saveLocalData(state.data);
      setSyncStatus("cloud", "Loaded cloud data.");
    } else if (localDataExists()) {
      setSyncStatus("local", "Cloud is empty. Upload this device to start syncing.");
    } else {
      state.data = normalizeData({ exercises: [], templates: [], sessions: [] }, { allowEmpty: true });
      setSyncStatus("cloud", "Cloud is ready.");
    }
  } catch (error) {
    console.error(error);
    setSyncStatus("offline", "Could not load cloud data. Using this device for now.");
  }
  render();
}

async function signInWithEmail() {
  const email = document.querySelector("[data-auth-email]")?.value.trim();
  if (!email) {
    state.auth.message = "Enter your email first.";
    setSyncStatus("local", state.auth.message);
    render();
    return;
  }
  state.auth.email = email;
  const client = getSupabaseClient();
  if (!client) return;
  const redirectUrl = getAuthRedirectUrl();
  if (!redirectUrl) {
    setSyncStatus("offline", "Open the hosted app URL to use email login. Supabase cannot send magic links back to this local file.");
    render();
    return;
  }
  setSyncStatus("syncing", "Sending login link...");
  render();
  const options = { emailRedirectTo: redirectUrl };
  const { error } = await client.auth.signInWithOtp({ email, options });
  if (error) {
    console.error(error);
    setSyncStatus("offline", error.message || "Could not send login link.");
  } else {
    setSyncStatus("cloud", "Check your email for the login link.");
  }
  render();
}

function getAuthRedirectUrl() {
  const configuredUrl = supabaseConfig().appUrl;
  if (window.location.protocol === "file:") return configuredUrl || "";
  return window.location.origin + window.location.pathname;
}

async function signOut() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  state.auth.user = null;
  setSyncStatus("local", "Signed out. Saved on this device.");
  render();
}

async function uploadLocalToCloud() {
  if (!state.auth.user) return;
  if (state.sync.cloudHadData && state.localStartupData?.sessions?.length) {
    const replace = confirm("Upload this device's saved data to cloud? This replaces the cloud copy for this account with the data that was on this device before sign-in.");
    if (!replace) return;
  }
  setSyncStatus("syncing", "Uploading this device to cloud...");
  render();
  try {
    state.data = normalizeData(structuredClone(state.localStartupData || state.data));
    await saveCloudData(state.data);
    saveLocalData(state.data);
    localStorage.setItem(LOCAL_MIGRATION_KEY, state.auth.user.id);
    setSyncStatus("cloud", "This device is now synced to cloud.");
  } catch (error) {
    console.error(error);
    markPendingSync(true);
    setSyncStatus("offline", "Upload failed. Saved locally and will retry.");
  }
  render();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;
  navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("Service worker registration failed", error));
}
