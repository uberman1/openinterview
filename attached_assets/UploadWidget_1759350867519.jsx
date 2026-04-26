import React, { useState } from 'react';

export default function UploadWidget() {
  const [upload, setUpload] = useState(null);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const resp = await fetch('/api/v1/uploads', { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json();
        setError(err.error || 'Upload failed');
        return;
      }
      const data = await resp.json();
      setUpload(data.upload);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFile} />
      {upload && (
        <div>
          <p>Uploaded: {upload.id}</p>
          <p>URL: {upload.url}</p>
          <p>Size: {upload.size} bytes</p>
          <p>Type: {upload.contentType}</p>
        </div>
      )}
      {error && <p style={{color:'red'}}>{error}</p>}
    </div>
  );
}
