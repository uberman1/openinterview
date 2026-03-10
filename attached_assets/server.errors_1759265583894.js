// /server/errors.js
export class ApiError extends Error {
  constructor(status, code, message, details = undefined){
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const Errors = {
  badRequest: (msg, details)=> new ApiError(400, 'BAD_REQUEST', msg || 'Bad request', details),
  notFound: (msg)=> new ApiError(404, 'NOT_FOUND', msg || 'Not found'),
  conflict: (msg)=> new ApiError(409, 'CONFLICT', msg || 'Conflict'),
  server: (msg)=> new ApiError(500, 'SERVER_ERROR', msg || 'Server error')
}

export function errorMiddleware(err, req, res, next){
  const status = err.status || 500
  const payload = {
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Server error',
      details: err.details
    }
  }
  res.status(status).json(payload)
}
