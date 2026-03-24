const handleCastError = (err) => ({
  status: 400,
  message: `Invalid ${err.path}: ${err.value}`,
});

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return {
    status: 409,
    message: `Duplicate value for field: "${field}". Please use another value.`,
  };
};

const handleValidationError = (err) => ({
  status: 400,
  message: Object.values(err.errors)
    .map((e) => e.message)
    .join(". "),
});

const handleJWTError = () => ({
  status: 401,
  message: "Invalid token. Please log in again.",
});

const handleJWTExpiredError = () => ({
  status: 401,
  message: "Your token has expired. Please log in again.",
});

const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "CastError") ({ status, message } = handleCastError(err));
  else if (err.code === 11000)
    ({ status, message } = handleDuplicateKeyError(err));
  else if (err.name === "ValidationError")
    ({ status, message } = handleValidationError(err));
  else if (err.name === "JsonWebTokenError")
    ({ status, message } = handleJWTError());
  else if (err.name === "TokenExpiredError")
    ({ status, message } = handleJWTExpiredError());

  if (status >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
      err,
    );
  }

  res.status(status).json({
    status: status >= 500 ? "error" : "fail",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
