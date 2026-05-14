/**
 * Jest setup: provide minimal stubs for PDF.js and Blob URL.
 */
global.pdfjsLib = undefined; // app.js checks for existence before loading
const origCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = (blob) => {
  // allow tests to detect ICS creation
  if (blob && blob.type && String(blob.type).includes('text/calendar')) {
    global.__ICS_CREATED__ = true;
  }
  return origCreateObjectURL ? origCreateObjectURL(blob) : 'blob:stub';
};
