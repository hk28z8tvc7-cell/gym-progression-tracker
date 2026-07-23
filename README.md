# Gym Progression Tracker

Static gym notebook app with Supabase login/sync and GitHub Pages hosting.

Live app URL:

```text
https://hk28z8tvc7-cell.github.io/gym-progression-tracker/
```

## What GitHub Does

GitHub stores the app files and GitHub Pages hosts them at a public HTTPS URL. Supabase stores the workout data, so updating the app code does not erase workouts.

## Supabase

The app is configured for this Supabase project:

```text
https://vukisdktbflkfvtpjfeh.supabase.co
```

The browser uses the publishable Supabase key in `config.js`. This key is safe to publish because table access is protected by Row Level Security.

In Supabase Auth settings:

1. Enable email magic-link login.
2. After GitHub Pages gives you the app URL, add it to allowed redirect URLs.

The database schema and RLS policies are in `supabase-schema.sql`. They have already been applied to the connected Supabase project.

## GitHub Pages Setup

1. Create a new GitHub repository.
2. Upload or push the contents of this folder as the repository root.
3. In the repository, go to Settings -> Pages.
4. Set Source to GitHub Actions.
5. Push to the `main` branch.
6. GitHub Actions will publish the app and show the Pages URL.

The included workflow is `.github/workflows/deploy-pages.yml`.

## Updating the App

Edit the files, commit, and push to `main`. GitHub Pages redeploys automatically. Your workout data stays in Supabase.

## Local Use

Opening `index.html` directly still works for local testing, but magic-link login works best from the GitHub Pages HTTPS URL.
