# iNotebook

iNotebook is a React notes app with a local Node.js API and SQLite database.
It includes a custom notebook favicon, matching app icon, and responsive interface for desktop and mobile.
Use the navigation theme switch to choose light or dark mode; the selection is remembered in your browser.

## Run the app

Use Node.js 22.13 or newer. From this folder, run:

```sh
npm install
npm run both
```

The React app opens at `http://localhost:3000`; its API runs at `http://localhost:5000`. The API creates `Backend/data/inotebook.sqlite` and a local token-signing secret automatically. Both files stay on this computer and are excluded from Git.

Open **Create account**, enter a name, email, and password (at least 5 characters), then submit the form. Once signed in, you can add, edit, and delete your notes, attach up to five images, PDFs, or MP4/WebM videos (50 MB per file, 200 MB total), and optionally set a due date. Each account can access only its own notes and attachments.

The SQLite database and uploaded files stay on this computer under `Backend/data/`.

To run only the API use `npm run backend`; to run only React use `npm start`. To run the backend checks use `npm run test:backend`.

This setup is intended for local development. Before deploying it publicly, use a production database and HTTPS, configure allowed frontend origins, and review the deployment security requirements.

## Free-tier deployment

Vercel hosts the React frontend. The API is a separate Node.js service and uses Supabase for persistent Postgres data and private attachment storage. Local development continues to use SQLite and local files.

### Set up Supabase

1. Create a Supabase project on the Free plan.
2. In the Supabase **SQL Editor**, run the contents of [`Backend/supabase.sql`](./Backend/supabase.sql). This creates the app tables and the private attachment bucket.
3. From **Project Settings → API**, copy the project URL and the `service_role` key. Treat the service-role key as a password; add it only to Render's private environment variables, never to Vercel or source control.
4. Supabase Free currently limits storage files to 50 MB each and storage to 1 GB. Free projects can pause after a week of inactivity.

### Deploy the API to Render

1. In Render, select **New + → Blueprint**, connect this GitHub repository, and choose branch `master`.
2. The `render.yaml` Blueprint configures the Node.js API as a Free web service. Enter these values when prompted:
   - `FRONTEND_ORIGIN`: `https://i-notebook-livid-alpha.vercel.app`
   - `SUPABASE_URL`: the Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret `service_role` key
   - `TOKEN_SECRET`: a fresh random secret of at least 32 characters
3. Create the service and wait for deployment. Render's Free web service can sleep when idle, so the first request after inactivity may be slow; its local disk is temporary, while application data is kept in Supabase.
4. Check `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

### Connect Vercel

1. In Vercel, open **Project → Settings → Environment Variables**.
2. Add `REACT_APP_API_URL` with the Render service's public origin, without a trailing slash or `/api`.
3. Select **Production**, save, and redeploy the latest frontend from **Deployments**.

The free setup limits each attachment to 50 MB (the total attachment size per note remains 200 MB). Supabase Free has a 500 MB database and 1 GB file-storage quota; Render and Supabase may pause/sleep free resources. Review each provider's current limits before relying on this for important data. Existing local SQLite accounts and uploads are not automatically copied into the new Supabase project; create a new account on the deployed site.
