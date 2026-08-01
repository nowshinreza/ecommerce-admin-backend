import prisma from "../prisma.js";

export async function createRole(data) {
  const existingRole = await prisma.role.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existingRole) {
    const error = new Error("Role already exists");
    error.statusCode = 409;
    throw error;
  }

  const uniquePermissionIds = [...new Set(data.permissionIds)];

  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: uniquePermissionIds,
      },
    },
  });

  if (permissions.length !== uniquePermissionIds.length) {
    const error = new Error("One or more permissions do not exist");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (transaction) => {
    const role = await transaction.role.create({
      data: {
        name: data.name,
        description: data.description || null,
        status: data.status,
      },
    });

    await transaction.rolePermission.createMany({
      data: uniquePermissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    });

    return transaction.role.findUnique({
      where: {
        id: role.id,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  });
}

export async function getRoles(query) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const search = query.search;

  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    }),

    prisma.role.count({
      where,
    }),
  ]);

  return {
    items: roles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRoleById(id) {
  const role = await prisma.role.findUnique({
    where: {
      id,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    const error = new Error("Role not found");
    error.statusCode = 404;
    throw error;
  }

  return role;
}

export async function updateRole(id, data) {
  const existingRole = await prisma.role.findUnique({
    where: {
      id,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!existingRole) {
    const error = new Error("Role not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name !== existingRole.name) {
    const duplicateRole = await prisma.role.findUnique({
      where: {
        name: data.name,
      },
    });

    if (duplicateRole) {
      const error = new Error("Role already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.permissionIds) {
    const uniquePermissionIds = [...new Set(data.permissionIds)];

    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: uniquePermissionIds,
        },
      },
    });

    if (permissions.length !== uniquePermissionIds.length) {
      const error = new Error("One or more permissions do not exist");
      error.statusCode = 400;
      throw error;
    }

    const roleUpdatePermission = await prisma.permission.findUnique({
      where: {
        name: "role:update",
      },
    });

    const currentlyHasRoleUpdate = existingRole.permissions.some(
      (item) => item.permission.name === "role:update",
    );

    const willHaveRoleUpdate = roleUpdatePermission
      ? uniquePermissionIds.includes(roleUpdatePermission.id)
      : false;

    if (currentlyHasRoleUpdate && !willHaveRoleUpdate) {
      const otherManagerCount = await prisma.rolePermission.count({
        where: {
          permission: {
            name: "role:update",
          },
          roleId: {
            not: id,
          },
          role: {
            status: true,
          },
        },
      });

      if (otherManagerCount === 0) {
        const error = new Error(
          "Cannot remove role:update from the last role that can manage roles",
        );
        error.statusCode = 409;
        throw error;
      }
    }
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.role.update({
      where: {
        id,
      },
      data: {
        name: data.name ?? existingRole.name,
        description:
          data.description !== undefined
            ? data.description
            : existingRole.description,
        status:
          data.status !== undefined
            ? data.status
            : existingRole.status,
      },
    });

    if (data.permissionIds) {
      const uniquePermissionIds = [...new Set(data.permissionIds)];

      await transaction.rolePermission.deleteMany({
        where: {
          roleId: id,
        },
      });

      await transaction.rolePermission.createMany({
        data: uniquePermissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return transaction.role.findUnique({
      where: {
        id,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  });
}

export async function deleteRole(id) {
  const role = await prisma.role.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    const error = new Error("Role not found");
    error.statusCode = 404;
    throw error;
  }

  if (role._count.users > 0) {
    const error = new Error(
      "Cannot delete a role while users are assigned to it",
    );
    error.statusCode = 409;
    throw error;
  }

  const hasRoleUpdatePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: id,
      permission: {
        name: "role:update",
      },
    },
  });

  if (hasRoleUpdatePermission) {
    const otherManagerCount = await prisma.rolePermission.count({
      where: {
        permission: {
          name: "role:update",
        },
        roleId: {
          not: id,
        },
        role: {
          status: true,
        },
      },
    });

    if (otherManagerCount === 0) {
      const error = new Error(
        "Cannot delete the last role that can manage roles",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  await prisma.role.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}