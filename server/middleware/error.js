export const notFound = (_req, res) => res.status(404).json({ message: 'Route not found.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message;
  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 10 MB or smaller.' : 'Upload at most 3 files at a time.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err.name === 'VersionError') {
    status = 409;
    message = 'This paper changed in the meantime. Reload and try again.';
  } else if (err.name === 'CastError' || err.name === 'ValidationError') {
    status = 400;
    message = 'Invalid request data.';
  } else if (err.type === 'entity.parse.failed') message = 'Malformed JSON body.';
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Something went wrong on our side.' : message, details: err.details });
}
