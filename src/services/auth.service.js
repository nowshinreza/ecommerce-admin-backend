import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../prisma.js";

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m",
    },
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      tokenId: crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

function removePrivateFields(user) {
  const { password, refreshTokenHash, ...safeUser } = user;
  return safeUser;
}

export async function loginUser(email, password) {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.active) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.role.status) {
    const error = new Error("Your role is inactive");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshTokenHash,
    },
  });

  const permissions = user.role.permissions.map(
    (item) => item.permission.name,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      ...removePrivateFields(user),
      permissions,
    },
  };
}

export async function refreshUserToken(refreshToken) {
  let payload;

  try {
    payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    include: {
      role: true,
    },
  });

  if (!user || !user.active || !user.role.status) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  if (!user.refreshTokenHash) {
    const error = new Error("Refresh token has been revoked");
    error.statusCode = 401;
    throw error;
  }

  const tokenMatches = await bcrypt.compare(
    refreshToken,
    user.refreshTokenHash,
  );

  if (!tokenMatches) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const newAccessToken = createAccessToken(user);
  const newRefreshToken = createRefreshToken(user);
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(userId, refreshToken) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user || !user.refreshTokenHash) {
    return;
  }

  const tokenMatches = await bcrypt.compare(
    refreshToken,
    user.refreshTokenHash,
  );

  if (tokenMatches) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash: null,
      },
    });
  }
}

export async function getCurrentSession(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.active || !user.role.status) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const permissions = user.role.permissions.map(
    (item) => item.permission.name,
  );

  return {
    ...removePrivateFields(user),
    permissions,
  };
}