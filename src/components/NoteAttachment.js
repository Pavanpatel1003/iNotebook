import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../config';

const formatFileSize = (bytes) => (
    bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
);

const NoteAttachment = ({ attachment }) => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    }, [previewUrl]);

    const handlePreview = async () => {
        if (previewUrl) {
            setPreviewUrl('');
            setError('');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/attachments/${attachment.id}`, {
                headers: { 'auth-token': localStorage.getItem('token') }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Could not open this attachment.');
            }
            setPreviewUrl(URL.createObjectURL(await response.blob()));
        } catch (requestError) {
            setError(requestError.message || 'Could not open this attachment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <li className="note-attachment">
            <span className="note-attachment-icon" aria-hidden="true">
                {attachment.mimeType.startsWith('image/') ? '▧' : attachment.mimeType.startsWith('video/') ? '▶' : 'PDF'}
            </span>
            <span className="note-attachment-details">
                <span className="note-attachment-name" title={attachment.name}>{attachment.name}</span>
                <span className="note-attachment-size">{formatFileSize(attachment.sizeBytes)}</span>
            </span>
            <button className="note-attachment-button" type="button" onClick={handlePreview} disabled={loading}>
                {loading ? 'Loading…' : previewUrl ? 'Close' : 'Preview'}
            </button>
            {error && <span className="note-attachment-error" role="alert">{error}</span>}
            {previewUrl && (
                <div className="note-attachment-preview">
                    {attachment.mimeType.startsWith('image/') && (
                        <img src={previewUrl} alt={attachment.name} loading="lazy" />
                    )}
                    {attachment.mimeType.startsWith('video/') && (
                        <video src={previewUrl} controls preload="metadata">
                            Your browser does not support video playback.
                        </video>
                    )}
                    {attachment.mimeType === 'application/pdf' && (
                        <iframe src={previewUrl} title={`PDF preview: ${attachment.name}`} />
                    )}
                </div>
            )}
        </li>
    );
};

export default NoteAttachment;
