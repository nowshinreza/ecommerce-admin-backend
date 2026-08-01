import bcrypt from "bcrypt";
import prisma from "../prisma.js";

function removePrivateFields(user) {
  const { password, refreshTokenHash, ...safeUser } = user;
  return safeUser;
}

export async function createUser(data) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    const error = new Error("A user with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const role = await prisma.role.findUnique({
    where: {
      id: data.roleId,
    },
  });

  if (!role) {
    const error = new Error("Role not found");
    error.statusCode = 404;
    throw error;
  }

  if (!role.status) {
    const error = new Error("Cannot assign an inactive role");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone || null,
      gender: data.gender || null,
      avatar: data.avatar || null,
      active: data.active,
      roleId: data.roleId,
    },
    include: {
      role: true,
    },
  });

  return removePrivateFields(user);
}

export async function getUsers(query) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where = {
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),

    ...(query.roleId
      ? {
          roleId: query.roleId,
        }
      : {}),

    ...(query.active !== undefined
      ? {
          active: query.active,
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    items: users.map(removePrivateFields),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      role: true,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return removePrivateFields(user);
}

export async function updateUser(id, data, currentUserId) {
  const existingUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!existingUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (
    id === currentUserId &&
    data.roleId !== undefined &&
    data.roleId !== existingUser.roleId
  ) {
    const error = new Error("You cannot change your own role");
    error.statusCode = 403;
    throw error;
  }

  if (data.email && data.email !== existingUser.email) {
    const duplicateUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (duplicateUser) {
      const error = new Error("A user with this email already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.roleId !== undefined) {
    const role = await prisma.role.findUnique({
      where: {
        id: data.roleId,
      },
    });

    if (!role) {
      const error = new Error("Role not found");
      error.statusCode = 404;
      throw error;
    }

    if (!role.status) {
      const error = new Error("Cannot assign an inactive role");
      error.statusCode = 400;
      throw error;
    }
  }

  let hashedPassword;

  if (data.password) {
    hashedPassword = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: {
      id,
    },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.email !== undefined && {
        email: data.email,
      }),

      ...(hashedPassword !== undefined && {
        password: hashedPassword,
      }),

      ...(data.phone !== undefined && {
        phone: data.phone,
      }),

      ...(data.gender !== undefined && {
        gender: data.gender,
      }),

      ...(data.avatar !== undefined && {
        avatar: data.avatar,
      }),

      ...(data.roleId !== undefined && {
        roleId: data.roleId,
      }),

      ...(data.active !== undefined && {
        active: data.active,
      }),

      ...(data.active === false && {
        refreshTokenHash: null,
      }),
    },
    include: {
      role: true,
    },
  });

  return removePrivateFields(user);
}

export async function deleteUser(id, currentUserId) {
  if (id === currentUserId) {
    const error = new Error("You cannot delete your own account");
    error.statusCode = 403;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.user.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}