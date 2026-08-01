import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export async function authenticate(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const accessToken = authorizationHeader.split(" ")[1];

    let payload;

    try {
      payload = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
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
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map(
        (item) => item.permission.name,
      ),
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.user.permissions.includes(permissionName)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission: ${permissionName}`,
      });
    }

    next();
  };
}