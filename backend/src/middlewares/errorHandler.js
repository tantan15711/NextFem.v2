const errorHandler = (error, req, res, next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  const message = error.publicMessage || "Ocurrio un error en el servidor.";

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
