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

1. On the API host, use Node.js 22.13 or newer, set `PORT` as provided by the host, and set `DATABASE_PATH` to a location on persistent storage. The database, token-signing secret, and uploaded files must survive restarts. Do not use an ephemeral filesystem for user data.
2. Set the API host's `FRONTEND_ORIGIN` to the exact public Vercel origin, for example `https://your-app.vercel.app` (no trailing slash).
3. In Vercel, add the `REACT_APP_API_URL` environment variable with the API's public origin, for example `https://your-api.example.com` (no `/api` suffix), for every environment you deploy.
4. Redeploy the Vercel frontend after setting the environment variable. Without it, production builds show a configuration error rather than trying to contact `localhost`.

The existing backend stores SQLite data and uploads on disk and supports attachments up to 200 MB. Choose an API host and storage plan that support persistent storage and the required upload size; Vercel's frontend deployment does not host this backend or its data.
