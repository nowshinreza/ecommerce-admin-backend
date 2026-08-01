import jwt from "jsonwebtoken";
import {
  getCurrentSession,
  loginUser,
  logoutUser,
  refreshUserToken,
} from "../services/auth.service.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    const result = await refreshUserToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    let payload;

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );
    } catch {
      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    }

    await logoutUser(payload.userId, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
}

export async function session(req, res, next) {
  try {
    const user = await getCurrentSession(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Session retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}