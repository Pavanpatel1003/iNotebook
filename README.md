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

Open **Create account**, enter a name, email, and password (at least 5 characters), then submit the form. Once signed in, you can add, edit, and delete your notes, attach up to five images, PDFs, or MP4/WebM videos (200 MB per file, 200 MB total), and optionally set a due date. Each account can access only its own notes and attachments.

The SQLite database and uploaded files stay on this computer under `Backend/data/`.

To run only the API use `npm run backend`; to run only React use `npm start`. To run the backend checks use `npm run test:backend`.

This setup is intended for local development. Before deploying it publicly, use a production database and HTTPS, configure allowed frontend origins, and review the deployment security requirements.

## Deploying the frontend and API

Vercel can host the React frontend, but this project’s API is a separate Node.js server. Deploy the API to a Node.js host that supports persistent storage, then configure:

For Render, this repository includes a Blueprint in `render.yaml`. In Render, choose **New + → Blueprint**, connect this GitHub repository, and create the `inotebook-api` service. The Blueprint asks for `FRONTEND_ORIGIN`; enter the exact Vercel origin, for example `https://your-app.vercel.app` (no trailing slash). It provisions a 1 GB persistent disk mounted at `/var/data` for the SQLite database, token secret, and uploaded files. The `starter` service plan and persistent disk may incur charges; review Render's current pricing and approve it before creating the service.

Wait for the Render service to finish deploying, then check `https://YOUR-RENDER-SERVICE.onrender.com/api/health`. Copy the service's public origin, without a trailing slash or `/api`.

In Vercel, open **Project → Settings → Environment Variables** and add `REACT_APP_API_URL` with that Render origin for the **Production** environment. Save, then redeploy the frontend from **Deployments**. `PORT` is supplied by Render automatically. Without this environment variable, production builds show a configuration error rather than trying to contact `localhost`.

The existing backend stores SQLite data and uploads on disk and supports attachments up to 200 MB. Choose an API host and storage plan that support persistent storage and the required upload size; Vercel's frontend deployment does not host this backend or its data.
