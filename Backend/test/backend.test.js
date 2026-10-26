const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'inotebook-backend-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.sqlite');

const {
    createServer,
    database,
    validateAttachments,
    MAX_ATTACHMENT_SIZE,
    MAX_TOTAL_ATTACHMENT_SIZE
} = require('../index');
const server = createServer();
let baseUrl;

before(async () => {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
});

const postJson = (route, body, token) => fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'auth-token': token } : {})
    },
    body: JSON.stringify(body)
});

test('free storage attachment limit is 50 MB per file and 200 MB per note', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const makePng = (size) => ({
        originalName: 'large.png',
        buffer: {
            length: size,
            subarray: () => pngHeader
        }
    });

    assert.equal(MAX_ATTACHMENT_SIZE, 50 * 1024 * 1024);
    assert.equal(MAX_TOTAL_ATTACHMENT_SIZE, 200 * 1024 * 1024);
    assert.equal(validateAttachments([makePng(MAX_ATTACHMENT_SIZE)]).length, 1);
    assert.throws(
        () => validateAttachments([makePng(MAX_ATTACHMENT_SIZE + 1)]),
        /50 MB or smaller/
    );
    assert.throws(
        () => validateAttachments([
            makePng(50 * 1024 * 1024),
            makePng(50 * 1024 * 1024),
            makePng(50 * 1024 * 1024),
            makePng(50 * 1024 * 1024),
            makePng(1)
        ]),
        /total 200 MB or less/
    );
});

test('signup, login, and owner-scoped note CRUD work', async () => {
    const signupResponse = await postJson('/api/auth/createuser', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test-pass-123',
        cpassword: 'test-pass-123'
    });
    assert.equal(signupResponse.status, 201);
    const signupData = await signupResponse.json();
    assert.equal(signupData.success, true);
    assert.equal(typeof signupData.authtoken, 'string');

    const duplicateResponse = await postJson('/api/auth/createuser', {
        name: 'Test User',
        email: 'TEST@example.com',
        password: 'test-pass-123',
        cpassword: 'test-pass-123'
    });
    assert.equal(duplicateResponse.status, 409);

    const invalidLoginResponse = await postJson('/api/auth/login', {
        email: 'test@example.com',
        password: 'wrong-password'
    });
    assert.equal(invalidLoginResponse.status, 401);

    const loginResponse = await postJson('/api/auth/login', {
        email: 'TEST@example.com',
        password: 'test-pass-123'
    });
    assert.equal(loginResponse.status, 200);
    const { authtoken } = await loginResponse.json();
    assert.equal(typeof authtoken, 'string');

    const unauthorizedResponse = await fetch(`${baseUrl}/api/notes/fetchallnotes`);
    assert.equal(unauthorizedResponse.status, 401);

    const invalidUploadForm = new FormData();
    invalidUploadForm.append('title', 'A rejected note');
    invalidUploadForm.append('description', 'This attachment should not be saved.');
    invalidUploadForm.append('tag', '');
    invalidUploadForm.append('dueDate', '');
    invalidUploadForm.append(
        'attachments',
        new Blob(['not an image'], { type: 'image/png' }),
        'spoofed.png'
    );
    const invalidUploadResponse = await fetch(`${baseUrl}/api/notes/addnote`, {
        method: 'POST',
        headers: { 'auth-token': authtoken },
        body: invalidUploadForm
    });
    assert.equal(invalidUploadResponse.status, 400);

    const noteForm = new FormData();
    noteForm.append('title', 'A useful note');
    noteForm.append('description', 'Some details to remember.');
    noteForm.append('tag', 'Testing');
    noteForm.append('dueDate', '2026-11-15');
    noteForm.append(
        'attachments',
        new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }),
        'idea.png'
    );
    const createNoteResponse = await fetch(`${baseUrl}/api/notes/addnote`, {
        method: 'POST',
        headers: { 'auth-token': authtoken },
        body: noteForm
    });
    assert.equal(createNoteResponse.status, 201);
    const note = await createNoteResponse.json();
    assert.equal(note.dueDate, '2026-11-15');
    assert.equal(note.attachments.length, 1);
    assert.equal(note.attachments[0].name, 'idea.png');

    const listResponse = await fetch(`${baseUrl}/api/notes/fetchallnotes`, {
        headers: { 'auth-token': authtoken }
    });
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), [note]);

    const attachmentUrl = `${baseUrl}/api/attachments/${note.attachments[0].id}`;
    const privateAttachmentResponse = await fetch(attachmentUrl);
    assert.equal(privateAttachmentResponse.status, 401);
    const attachmentResponse = await fetch(attachmentUrl, {
        headers: { 'auth-token': authtoken }
    });
    assert.equal(attachmentResponse.status, 200);
    assert.equal(attachmentResponse.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await attachmentResponse.arrayBuffer()), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const updateResponse = await fetch(`${baseUrl}/api/notes/updatenote/${note._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'auth-token': authtoken },
        body: JSON.stringify({
            title: 'An updated note',
            description: 'These are updated details.',
            tag: 'Updated',
            dueDate: '2026-12-01'
        })
    });
    assert.equal(updateResponse.status, 200);
    const updatedNote = await updateResponse.json();
    assert.equal(updatedNote.title, 'An updated note');
    assert.equal(updatedNote.dueDate, '2026-12-01');

    const secondSignupResponse = await postJson('/api/auth/createuser', {
        name: 'Another User',
        email: 'another@example.com',
        password: 'another-pass-123',
        cpassword: 'another-pass-123'
    });
    const secondUser = await secondSignupResponse.json();
    const secondUserNotesResponse = await fetch(`${baseUrl}/api/notes/fetchallnotes`, {
        headers: { 'auth-token': secondUser.authtoken }
    });
    assert.deepEqual(await secondUserNotesResponse.json(), []);
    const otherUserAttachmentResponse = await fetch(attachmentUrl, {
        headers: { 'auth-token': secondUser.authtoken }
    });
    assert.equal(otherUserAttachmentResponse.status, 404);

    const storedFile = database.prepare('SELECT stored_name FROM attachments WHERE id = ?')
        .get(note.attachments[0].id);
    assert.equal(fs.existsSync(path.join(testDirectory, 'uploads', storedFile.stored_name)), true);

    const deleteResponse = await fetch(`${baseUrl}/api/notes/deletenote/${note._id}`, {
        method: 'DELETE',
        headers: { 'auth-token': authtoken }
    });
    assert.equal(deleteResponse.status, 200);
    assert.equal(fs.existsSync(path.join(testDirectory, 'uploads', storedFile.stored_name)), false);

    const emptyListResponse = await fetch(`${baseUrl}/api/notes/fetchallnotes`, {
        headers: { 'auth-token': authtoken }
    });
    assert.deepEqual(await emptyListResponse.json(), []);
});
