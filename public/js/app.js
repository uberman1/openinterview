// API helper function for making requests to backend
export async function api(path, options = {}) {
  const { method = 'GET', body, headers: customHeaders = {} } = options;
  
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    method,
    headers,
  };
  
  if (body) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  const response = await fetch(path, config);
  
  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await response.json();
  } catch {
    return null;
  }
}
