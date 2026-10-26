const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
const http = require('node:http');
const { createClient } = require('@supabase/supabase-js');

const scrypt = promisify(crypto.scrypt);
const DATA_DIRECTORY = path.join(__dirname, 'data');
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(DATA_DIRECTORY, 'inotebook.sqlite');
const UPLOAD_DIRECTORY = path.join(path.dirname(DATABASE_PATH), 'uploads');
const PORT = Number(process.env.PORT || 5000);
const MAX_REQUEST_SIZE = 210 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 200 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'note-attachments';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
if (Boolean(SUPABASE_URL) !== Boolean(SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}
if (process.env.NODE_ENV === 'production' && !useSupabase) {
    throw new Error('Configure Supabase before starting the production API.');
}
const supabase = useSupabase
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;
const FRONTEND_ORIGINS = new Set(
    (process.env.FRONTEND_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);
const PASSWORD_LENGTH_MIN = 5;
const PASSWORD_LENGTH_MAX = 256;
const NOTE_TITLE_MAX = 100;
const NOTE_DESCRIPTION_MAX = 2000;
const NOTE_TAG_MAX = 40;
const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

let database = null;
if (!useSupabase) {
    fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
    database = new DatabaseSync(DATABASE_PATH);
    database.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            tag TEXT NOT NULL DEFAULT '',
            due_date TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL UNIQUE,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    const noteColumns = new Set(database.prepare('PRAGMA table_info(notes)').all().map((column) => column.name));
    if (!noteColumns.has('due_date')) {
        database.exec("ALTER TABLE notes ADD COLUMN due_date TEXT NOT NULL DEFAULT ''");
    }
}

let tokenSecret;
if (useSupabase) {
    if (typeof process.env.TOKEN_SECRET !== 'string' || Buffer.byteLength(process.env.TOKEN_SECRET) < 32) {
        throw new Error('Set TOKEN_SECRET to a random value with at least 32 bytes.');
    }
    tokenSecret = Buffer.from(process.env.TOKEN_SECRET);
} else {
    const secretPath = path.join(path.dirname(DATABASE_PATH), '.token-secret');
    try {
        tokenSecret = fs.readFileSync(secretPath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        tokenSecret = crypto.randomBytes(32);
        fs.writeFileSync(secretPath, tokenSecret, { flag: 'wx', mode: 0o600 });
    }
}

const sendJson = (response, status, data) => {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(data));
};

const readJson = (request) => new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
        body += chunk;
        if (Buffer.byteLength(body) > 16 * 1024) {
            reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
            request.destroy();
        }
    });
    request.on('end', () => {
        if (!body) {
            resolve({});
            return;
        }
        try {
            const data = JSON.parse(body);
            if (!data || Array.isArray(data) || typeof data !== 'object') {
                reject(Object.assign(new Error('Request body must be a JSON object.'), { status: 400 }));
                return;
            }
            resolve(data);
        } catch {
            reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
        }
    });
    request.on('error', reject);
});

const readRequestBuffer = (request, maxSize = MAX_REQUEST_SIZE) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
            tooLarge = true;
            chunks.length = 0;
        } else if (!tooLarge) {
            chunks.push(chunk);
        }
    });
    request.on('end', () => {
        if (tooLarge) {
            reject(Object.assign(new Error('Upload exceeds the 210 MB request limit.'), { status: 413 }));
            return;
        }
        resolve(Buffer.concat(chunks, size));
    });
    request.on('error', reject);
});

const parseMultipart = (body, boundary) => {
    const delimiter = Buffer.from(`--${boundary}`);
    const separator = Buffer.from('\r\n\r\n');
    const nextPart = Buffer.from(`\r\n--${boundary}`);
    const fields = {};
    const files = [];
    let cursor = body.indexOf(delimiter);
    let partCount = 0;

    if (cursor === -1) {
        throw Object.assign(new Error('Invalid multipart form data.'), { status: 400 });
    }

    while (cursor !== -1) {
        partCount += 1;
        if (partCount > MAX_ATTACHMENTS + 4) {
            throw Object.assign(new Error('The upload contains too many fields or files.'), { status: 400 });
        }
        cursor += delimiter.length;
        if (body.subarray(cursor, cursor + 2).toString() === '--') {
            break;
        }
        if (body.subarray(cursor, cursor + 2).toString() !== '\r\n') {
            throw Object.assign(new Error('Invalid multipart form data.'), { status: 400 });
        }

        const headersEnd = body.indexOf(separator, cursor + 2);
        if (headersEnd === -1) {
            throw Object.assign(new Error('Invalid multipart form data.'), { status: 400 });
        }
        const headers = body.subarray(cursor + 2, headersEnd).toString('latin1');
        const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
        const name = disposition?.[1].match(/(?:^|;)\s*name="([^"]*)"/i)?.[1];
        if (!name || !['title', 'description', 'tag', 'dueDate', 'attachments'].includes(name)) {
            throw Object.assign(new Error('Invalid multipart form field.'), { status: 400 });
        }

        const contentStart = headersEnd + separator.length;
        const contentEnd = body.indexOf(nextPart, contentStart);
        if (contentEnd === -1) {
            throw Object.assign(new Error('Incomplete multipart form data.'), { status: 400 });
        }
        const filenameMatch = disposition[1].match(/(?:^|;)\s*filename="([^"]*)"/i);
        const content = body.subarray(contentStart, contentEnd);

        if (filenameMatch && filenameMatch[1]) {
            if (name !== 'attachments') {
                throw Object.assign(new Error('Files must use the attachments field.'), { status: 400 });
            }
            const originalName = path.basename(filenameMatch[1].replace(/\\/g, '/'))
                .replace(/[\u0000-\u001f\u007f]/g, '')
                .slice(0, 180);
            files.push({ originalName, buffer: content });
        } else {
            fields[name] = content.toString('utf8');
        }

        cursor = contentEnd + 2;
    }

    return { fields, files };
};

const readNoteRequest = async (request) => {
    const contentType = request.headers['content-type'] || '';
    if (!/^multipart\/form-data\b/i.test(contentType)) {
        return { fields: await readJson(request), files: [] };
    }

    const boundary = contentType.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundary) {
        throw Object.assign(new Error('Multipart form boundary is missing.'), { status: 400 });
    }
    const { fields, files } = parseMultipart(
        await readRequestBuffer(request),
        (boundary[1] || boundary[2]).trim()
    );
    return { fields, files };
};

const validateAttachments = (files) => {
    if (files.length > MAX_ATTACHMENTS) {
        throw Object.assign(new Error(`Attach up to ${MAX_ATTACHMENTS} files to one note.`), { status: 400 });
    }
    if (files.some((file) => file.buffer.length === 0 || file.buffer.length > MAX_ATTACHMENT_SIZE)) {
        throw Object.assign(new Error('Each attachment must be 50 MB or smaller on the free storage plan.'), { status: 400 });
    }
    if (files.reduce((total, file) => total + file.buffer.length, 0) > MAX_TOTAL_ATTACHMENT_SIZE) {
        throw Object.assign(new Error('Attachments must total 200 MB or less.'), { status: 400 });
    }

    const types = {
        '.gif': { mimeType: 'image/gif', isValid: (buffer) => ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString()) },
        '.jpeg': { mimeType: 'image/jpeg', isValid: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
        '.jpg': { mimeType: 'image/jpeg', isValid: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
        '.pdf': { mimeType: 'application/pdf', isValid: (buffer) => buffer.subarray(0, 5).toString() === '%PDF-' },
        '.png': { mimeType: 'image/png', isValid: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
        '.mp4': { mimeType: 'video/mp4', isValid: (buffer) => buffer.subarray(4, 8).toString() === 'ftyp' },
        '.webm': { mimeType: 'video/webm', isValid: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
        '.webp': { mimeType: 'image/webp', isValid: (buffer) => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' }
    };

    return files.map((file) => {
        const extension = path.extname(file.originalName).toLowerCase();
        const type = types[extension];
        if (!type) {
            throw Object.assign(new Error('Use JPG, PNG, GIF, WebP, PDF, MP4, or WebM files.'), { status: 400 });
        }
        if (!type.isValid(file.buffer)) {
            throw Object.assign(new Error(`The file "${file.originalName}" does not match its file type.`), { status: 400 });
        }
        return { ...file, extension, mimeType: type.mimeType, sizeBytes: file.buffer.length };
    });
};

const saveAttachmentFiles = async (files, userId, noteId) => {
    if (!useSupabase) {
        await fs.promises.mkdir(UPLOAD_DIRECTORY, { recursive: true });
    }
    const saved = [];
    try {
        for (const file of files) {
            const storedName = useSupabase
                ? `${userId}/${noteId}/${crypto.randomUUID()}${file.extension}`
                : `${crypto.randomUUID()}${file.extension}`;
            const savedFile = { ...file, id: crypto.randomUUID(), storedName };
            if (useSupabase) {
                const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(
                    storedName,
                    file.buffer,
                    { contentType: file.mimeType, upsert: false }
                );
                if (error) {
                    throw error;
                }
            } else {
                savedFile.filePath = path.join(UPLOAD_DIRECTORY, storedName);
                await fs.promises.writeFile(savedFile.filePath, file.buffer, { flag: 'wx', mode: 0o600 });
            }
            saved.push(savedFile);
        }
        return saved;
    } catch (error) {
        await deleteStoredFiles(saved);
        throw error;
    }
};

const deleteStoredFiles = async (files) => {
    if (useSupabase) {
        if (files.length === 0) {
            return;
        }
        const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET)
            .remove(files.map((file) => file.stored_name || file.storedName));
        if (error) {
            console.error('Could not remove uploaded files from Supabase Storage:', error);
        }
        return;
    }
    await Promise.all(files.map((file) => fs.promises.unlink(file.filePath || path.join(UPLOAD_DIRECTORY, file.stored_name))
        .catch((error) => {
            if (error.code !== 'ENOENT') {
                console.error(`Could not delete uploaded file ${file.storedName || file.stored_name}:`, error);
            }
        })));
};

const getUserByEmail = async (email) => {
    if (!useSupabase) {
        return database.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
    }
    const { data, error } = await supabase.from('users')
        .select('id, password_hash')
        .eq('email', email)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data;
};

const createUser = async (id, name, email, passwordHash) => {
    if (!useSupabase) {
        database.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
            .run(id, name, email, passwordHash);
        return;
    }
    const { error } = await supabase.from('users').insert({
        id,
        name,
        email,
        password_hash: passwordHash
    });
    if (error) {
        throw error;
    }
};

const getNotesForUser = async (userId) => {
    if (!useSupabase) {
        const notes = database.prepare(`
            SELECT id AS _id, title, description, tag,
                due_date AS dueDate, created_at AS createdAt
            FROM notes WHERE user_id = ? ORDER BY created_at DESC
        `).all(userId);
        if (notes.length === 0) {
            return [];
        }
        const placeholders = notes.map(() => '?').join(', ');
        const attachments = database.prepare(`
            SELECT id, note_id AS noteId, original_name AS name,
                mime_type AS mimeType, size_bytes AS sizeBytes
            FROM attachments WHERE note_id IN (${placeholders})
            ORDER BY created_at ASC
        `).all(...notes.map((note) => note._id));
        return attachFilesToNotes(notes, attachments);
    }

    const { data: notes, error: notesError } = await supabase.from('notes')
        .select('id, title, description, tag, due_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (notesError) {
        throw notesError;
    }
    if (notes.length === 0) {
        return [];
    }
    const { data: attachments, error: attachmentsError } = await supabase.from('attachments')
        .select('id, note_id, original_name, mime_type, size_bytes')
        .in('note_id', notes.map((note) => note.id))
        .order('created_at', { ascending: true });
    if (attachmentsError) {
        throw attachmentsError;
    }
    return attachFilesToNotes(notes.map((note) => ({
        _id: note.id,
        title: note.title,
        description: note.description,
        tag: note.tag,
        dueDate: note.due_date,
        createdAt: note.created_at
    })), attachments.map((file) => ({
        id: file.id,
        noteId: file.note_id,
        name: file.original_name,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes
    })));
};

const attachFilesToNotes = (notes, attachments) => {
    const attachmentsByNote = new Map();
    for (const attachment of attachments) {
        const noteAttachments = attachmentsByNote.get(attachment.noteId) || [];
        noteAttachments.push({
            id: attachment.id,
            name: attachment.name,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes
        });
        attachmentsByNote.set(attachment.noteId, noteAttachments);
    }
    return notes.map((note) => ({
        ...note,
        attachments: attachmentsByNote.get(note._id) || []
    }));
};

const createNoteWithAttachments = async (id, userId, note, savedFiles) => {
    if (!useSupabase) {
        let transactionStarted = false;
        try {
            database.exec('BEGIN IMMEDIATE');
            transactionStarted = true;
            database.prepare(`
                INSERT INTO notes (id, user_id, title, description, tag, due_date)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, userId, note.title, note.description, note.tag, note.dueDate);
            const insertAttachment = database.prepare(`
                INSERT INTO attachments (id, note_id, original_name, stored_name, mime_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const file of savedFiles) {
                insertAttachment.run(file.id, id, file.originalName, file.storedName, file.mimeType, file.sizeBytes);
            }
            database.exec('COMMIT');
            transactionStarted = false;
        } catch (error) {
            if (transactionStarted) {
                database.exec('ROLLBACK');
            }
            await deleteStoredFiles(savedFiles);
            throw error;
        }
        return database.prepare('SELECT created_at AS createdAt FROM notes WHERE id = ?').get(id).createdAt;
    }

    const { data: createdNote, error: noteError } = await supabase.from('notes').insert({
        id,
        user_id: userId,
        title: note.title,
        description: note.description,
        tag: note.tag,
        due_date: note.dueDate
    }).select('created_at').single();
    if (noteError) {
        await deleteStoredFiles(savedFiles);
        throw noteError;
    }
    if (savedFiles.length > 0) {
        const { error: attachmentError } = await supabase.from('attachments').insert(savedFiles.map((file) => ({
            id: file.id,
            note_id: id,
            original_name: file.originalName,
            stored_name: file.storedName,
            mime_type: file.mimeType,
            size_bytes: file.sizeBytes
        })));
        if (attachmentError) {
            const { error: rollbackError } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
            if (rollbackError) {
                console.error('Could not remove an incomplete note after attachment metadata failed:', rollbackError);
            }
            await deleteStoredFiles(savedFiles);
            throw attachmentError;
        }
    }
    return createdNote.created_at;
};

const getAttachmentDetails = async (attachmentId, userId) => {
    if (!useSupabase) {
        return database.prepare(`
            SELECT a.id, a.original_name AS name, a.stored_name, a.mime_type AS mimeType,
                a.size_bytes AS sizeBytes
            FROM attachments a
            JOIN notes n ON n.id = a.note_id
            WHERE a.id = ? AND n.user_id = ?
        `).get(attachmentId, userId);
    }
    const { data: attachment, error } = await supabase.from('attachments')
        .select('id, note_id, original_name, stored_name, mime_type, size_bytes')
        .eq('id', attachmentId)
        .maybeSingle();
    if (error) {
        throw error;
    }
    if (!attachment) {
        return null;
    }
    const { data: note, error: noteError } = await supabase.from('notes')
        .select('id')
        .eq('id', attachment.note_id)
        .eq('user_id', userId)
        .maybeSingle();
    if (noteError) {
        throw noteError;
    }
    return note ? {
        id: attachment.id,
        name: attachment.original_name,
        stored_name: attachment.stored_name,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes
    } : null;
};

const downloadStoredFile = async (storedName) => {
    if (!useSupabase) {
        return fs.promises.readFile(path.join(UPLOAD_DIRECTORY, storedName));
    }
    const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(storedName);
    if (error) {
        throw error;
    }
    return Buffer.from(await data.arrayBuffer());
};

const updateNoteForUser = async (noteId, userId, note) => {
    if (!useSupabase) {
        return database.prepare(`
            UPDATE notes SET title = ?, description = ?, tag = ?, due_date = ?
            WHERE id = ? AND user_id = ?
        `).run(note.title, note.description, note.tag, note.dueDate, noteId, userId).changes > 0;
    }
    const { data, error } = await supabase.from('notes').update({
        title: note.title,
        description: note.description,
        tag: note.tag,
        due_date: note.dueDate
    }).eq('id', noteId).eq('user_id', userId).select('id').maybeSingle();
    if (error) {
        throw error;
    }
    return Boolean(data);
};

const deleteNoteForUser = async (noteId, userId) => {
    if (!useSupabase) {
        const attachmentFiles = database.prepare('SELECT stored_name FROM attachments WHERE note_id = ?').all(noteId);
        const result = database.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(noteId, userId);
        if (result.changes === 0) {
            return false;
        }
        await deleteStoredFiles(attachmentFiles);
        return true;
    }
    const { data: note, error: noteError } = await supabase.from('notes')
        .select('id')
        .eq('id', noteId)
        .eq('user_id', userId)
        .maybeSingle();
    if (noteError) {
        throw noteError;
    }
    if (!note) {
        return false;
    }
    const { data: attachments, error: attachmentError } = await supabase.from('attachments')
        .select('stored_name')
        .eq('note_id', noteId);
    if (attachmentError) {
        throw attachmentError;
    }
    const { error: deleteError } = await supabase.from('notes').delete()
        .eq('id', noteId)
        .eq('user_id', userId);
    if (deleteError) {
        throw deleteError;
    }
    await deleteStoredFiles(attachments);
    return true;
};

const createToken = (userId) => {
    const payload = Buffer.from(JSON.stringify({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
};

const getAuthenticatedUserId = (request) => {
    const token = request.headers['auth-token'];
    if (typeof token !== 'string') {
        return null;
    }

    const [payload, signature, ...extra] = token.split('.');
    if (!payload || !signature || extra.length > 0) {
        return null;
    }

    const expected = crypto.createHmac('sha256', tokenSecret).update(payload).digest();
    let received;
    try {
        received = Buffer.from(signature, 'base64url');
    } catch {
        return null;
    }
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        return null;
    }

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (typeof decoded.sub !== 'string' || decoded.exp <= Math.floor(Date.now() / 1000)) {
            return null;
        }
        return decoded.sub;
    } catch {
        return null;
    }
};

const normalizeNote = (body) => {
    const { title, description, tag = '', dueDate = '' } = body;
    if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > NOTE_TITLE_MAX) {
        throw Object.assign(new Error(`Title must be between 5 and ${NOTE_TITLE_MAX} characters.`), { status: 400 });
    }
    if (typeof description !== 'string' || description.trim().length < 5 || description.trim().length > NOTE_DESCRIPTION_MAX) {
        throw Object.assign(new Error(`Description must be between 5 and ${NOTE_DESCRIPTION_MAX} characters.`), { status: 400 });
    }
    if (typeof tag !== 'string' || tag.trim().length > NOTE_TAG_MAX) {
        throw Object.assign(new Error(`Tag must be ${NOTE_TAG_MAX} characters or fewer.`), { status: 400 });
    }
    if (typeof dueDate !== 'string' || (dueDate && (
        !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
        || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`))
        || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate
    ))) {
        throw Object.assign(new Error('Choose a valid due date.'), { status: 400 });
    }
    return { title: title.trim(), description: description.trim(), tag: tag.trim(), dueDate };
};

const createServer = () => http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && !FRONTEND_ORIGINS.has(origin)) {
        sendJson(response, 403, { message: 'This origin is not allowed.' });
        return;
    }

    if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, auth-token');
    }
    if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return;
    }

    try {
        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (request.method === 'GET' && pathname === '/api/health') {
            sendJson(response, 200, { status: 'ok' });
            return;
        }

        if (request.method === 'POST' && pathname === '/api/auth/createuser') {
            const body = await readJson(request);
            const { name, email, password, cpassword } = body;
            if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 80) {
                sendJson(response, 400, { success: false, message: 'Name is required and must be 80 characters or fewer.' });
                return;
            }
            if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                sendJson(response, 400, { success: false, message: 'Enter a valid email address.' });
                return;
            }
            if (typeof password !== 'string' || password.length < PASSWORD_LENGTH_MIN || password.length > PASSWORD_LENGTH_MAX) {
                sendJson(response, 400, { success: false, message: `Password must be between ${PASSWORD_LENGTH_MIN} and ${PASSWORD_LENGTH_MAX} characters.` });
                return;
            }
            if (password !== cpassword) {
                sendJson(response, 400, { success: false, message: 'Passwords do not match.' });
                return;
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (await getUserByEmail(normalizedEmail)) {
                sendJson(response, 409, { success: false, message: 'An account with this email already exists.' });
                return;
            }
            const salt = crypto.randomBytes(16);
            const passwordHash = await scrypt(password, salt, 64);
            const userId = crypto.randomUUID();
            await createUser(
                userId,
                name.trim(),
                normalizedEmail,
                `${salt.toString('hex')}:${passwordHash.toString('hex')}`
            );
            sendJson(response, 201, { success: true, sucess: true, authtoken: createToken(userId) });
            return;
        }

        if (request.method === 'POST' && pathname === '/api/auth/login') {
            const body = await readJson(request);
            if (typeof body.email !== 'string' || typeof body.password !== 'string') {
                sendJson(response, 400, { success: false, message: 'Email and password are required.' });
                return;
            }
            const user = await getUserByEmail(body.email.trim().toLowerCase());
            if (!user) {
                sendJson(response, 401, { success: false, message: 'Email or password is incorrect.' });
                return;
            }

            const [saltHex, hashHex] = user.password_hash.split(':');
            const savedHash = Buffer.from(hashHex, 'hex');
            const submittedHash = await scrypt(body.password, Buffer.from(saltHex, 'hex'), savedHash.length);
            if (savedHash.length !== submittedHash.length || !crypto.timingSafeEqual(savedHash, submittedHash)) {
                sendJson(response, 401, { success: false, message: 'Email or password is incorrect.' });
                return;
            }
            sendJson(response, 200, { success: true, sucess: true, authtoken: createToken(user.id) });
            return;
        }

        const userId = getAuthenticatedUserId(request);
        if (!userId) {
            sendJson(response, 401, { message: 'Please log in to continue.' });
            return;
        }

        if (request.method === 'GET' && pathname === '/api/notes/fetchallnotes') {
            sendJson(response, 200, await getNotesForUser(userId));
            return;
        }

        if (request.method === 'POST' && pathname === '/api/notes/addnote') {
            const { fields, files } = await readNoteRequest(request);
            const note = normalizeNote(fields);
            const attachments = validateAttachments(files);
            const id = crypto.randomUUID();
            const savedFiles = await saveAttachmentFiles(attachments, userId, id);
            const createdAt = await createNoteWithAttachments(id, userId, note, savedFiles);
            sendJson(response, 201, {
                _id: id,
                ...note,
                createdAt,
                attachments: savedFiles.map(({ id: attachmentId, originalName: name, mimeType, sizeBytes }) => ({
                    id: attachmentId,
                    name,
                    mimeType,
                    sizeBytes
                }))
            });
            return;
        }

        const attachmentRoute = pathname.match(/^\/api\/attachments\/([^/]+)$/);
        if (request.method === 'GET' && attachmentRoute) {
            const attachment = await getAttachmentDetails(attachmentRoute[1], userId);
            if (!attachment) {
                sendJson(response, 404, { message: 'Attachment not found.' });
                return;
            }

            const contents = await downloadStoredFile(attachment.stored_name);
            const safeFilename = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'attachment';
            response.writeHead(200, {
                'Content-Type': attachment.mimeType,
                'Content-Length': contents.length,
                'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN'
            });
            response.end(contents);
            return;
        }

        const noteRoute = pathname.match(/^\/api\/notes\/(updatenote|deletenote)\/([^/]+)$/);
        if (noteRoute) {
            const [, action, noteId] = noteRoute;
            if (action === 'updatenote' && (request.method === 'PUT' || request.method === 'POST')) {
                const { fields, files } = await readNoteRequest(request);
                if (files.length > 0) {
                    sendJson(response, 400, { message: 'Add attachments when creating a note.' });
                    return;
                }
                const note = normalizeNote(fields);
                if (!await updateNoteForUser(noteId, userId, note)) {
                    sendJson(response, 404, { message: 'Note not found.' });
                    return;
                }
                sendJson(response, 200, { _id: noteId, ...note });
                return;
            }
            if (action === 'deletenote' && request.method === 'DELETE') {
                if (!await deleteNoteForUser(noteId, userId)) {
                    sendJson(response, 404, { message: 'Note not found.' });
                    return;
                }
                sendJson(response, 200, { success: true });
                return;
            }
        }

        sendJson(response, 404, { message: 'Route not found.' });
    } catch (error) {
        if (response.headersSent || response.destroyed) {
            return;
        }
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
            sendJson(response, 409, { success: false, message: 'An account with this email already exists.' });
            return;
        }
        if (error instanceof SyntaxError) {
            sendJson(response, 400, { message: 'Request body must be valid JSON.' });
            return;
        }
        sendJson(response, error.status || 500, {
            message: error.status ? error.message : 'An unexpected server error occurred.'
        });
        if (!error.status) {
            console.error(error);
        }
    }
});

if (require.main === module) {
    const server = createServer();
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`iNotebook API listening at http://127.0.0.1:${PORT}`);
    });
    server.on('error', (error) => {
        console.error('Could not start the iNotebook API:', error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    createServer,
    database,
    useSupabase,
    validateAttachments,
    MAX_ATTACHMENT_SIZE,
    MAX_TOTAL_ATTACHMENT_SIZE
};
