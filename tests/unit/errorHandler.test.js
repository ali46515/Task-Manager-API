import errorHandler from "../../middlewares/errorHandler.js";

describe("Error Handler Middleware — Unit Tests", () => {
  const mockNext = jest.fn();

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const buildReq = () => ({ method: "GET", originalUrl: "/api/test" });

  it("handles generic error with 500", () => {
    const res = buildRes();
    errorHandler(new Error("Something broke"), buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("handles Mongoose CastError as 400", () => {
    const err = { name: "CastError", path: "_id", value: "bad-id" };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles duplicate key error (11000) as 409", () => {
    const err = { code: 11000, keyValue: { email: "test@test.com" } };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("handles Mongoose ValidationError as 400", () => {
    const err = {
      name: "ValidationError",
      errors: { name: { message: "Name is required" } },
    };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Name is required" }),
    );
  });

  it("handles JsonWebTokenError as 401", () => {
    const err = { name: "JsonWebTokenError" };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("handles TokenExpiredError as 401", () => {
    const err = { name: "TokenExpiredError" };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("uses err.statusCode if provided", () => {
    const err = { statusCode: 422, message: "Unprocessable" };
    const res = buildRes();
    errorHandler(err, buildReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(422);
  });
});
