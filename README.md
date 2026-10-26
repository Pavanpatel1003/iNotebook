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
