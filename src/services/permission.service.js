import prisma from "../prisma.js";

function normalizeGroupName(name) {
  return name.trim();
}

function normalizeAction(action) {
  return action.trim().toLowerCase().replace(/\s+/g, "-");
}

function createPermissionName(groupName, action) {
  const moduleName = groupName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  return `${moduleName}:${normalizeAction(action)}`;
}

export async function createPermissionGroup(data) {
  const name = normalizeGroupName(data.name);

  const existingGroup = await prisma.permissionGroup.findUnique({
    where: {
      name,
    },
  });

  if (existingGroup) {
    const error = new Error("Permission group already exists");
    error.statusCode = 409;
    throw error;
  }

  const uniqueActions = [
    ...new Set(data.actions.map((action) => normalizeAction(action))),
  ];

  return prisma.$transaction(async (transaction) => {
    const group = await transaction.permissionGroup.create({
      data: {
        name,
        description: data.description || null,
      },
    });

    await transaction.permission.createMany({
      data: uniqueActions.map((action) => ({
        name: createPermissionName(name, action),
        description: `Allows ${action} access for ${name}`,
        groupId: group.id,
      })),
    });

    return transaction.permissionGroup.findUnique({
      where: {
        id: group.id,
      },
      include: {
        permissions: {
          orderBy: {
            name: "asc",
          },
        },
      },
    });
  });
}

export async function getPermissionGroups(query) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const search = query.search?.trim();

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
          {
            permissions: {
              some: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      }
    : {};

  const [groups, total] = await Promise.all([
    prisma.permissionGroup.findMany({
      where,
      include: {
        permissions: {
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    }),

    prisma.permissionGroup.count({
      where,
    }),
  ]);

  return {
    items: groups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPermissionGroupById(id) {
  const group = await prisma.permissionGroup.findUnique({
    where: {
      id,
    },
    include: {
      permissions: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!group) {
    const error = new Error("Permission group not found");
    error.statusCode = 404;
    throw error;
  }

  return group;
}

export async function updatePermissionGroup(id, data) {
  const existingGroup = await prisma.permissionGroup.findUnique({
    where: {
      id,
    },
    include: {
      permissions: true,
    },
  });

  if (!existingGroup) {
    const error = new Error("Permission group not found");
    error.statusCode = 404;
    throw error;
  }

  const newName = data.name
    ? normalizeGroupName(data.name)
    : existingGroup.name;

  if (newName !== existingGroup.name) {
    const duplicateGroup = await prisma.permissionGroup.findFirst({
      where: {
        name: newName,
        NOT: {
          id,
        },
      },
    });

    if (duplicateGroup) {
      const error = new Error("Permission group already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.permissionGroup.update({
      where: {
        id,
      },
      data: {
        name: newName,
        description:
          data.description !== undefined
            ? data.description
            : existingGroup.description,
      },
    });

    if (data.actions) {
      const uniqueActions = [
        ...new Set(data.actions.map((action) => normalizeAction(action))),
      ];

      const newPermissionNames = uniqueActions.map((action) =>
        createPermissionName(newName, action),
      );

      await transaction.permission.deleteMany({
        where: {
          groupId: id,
          name: {
            notIn: newPermissionNames,
          },
        },
      });

      for (const action of uniqueActions) {
        const permissionName = createPermissionName(newName, action);

        await transaction.permission.upsert({
          where: {
            name: permissionName,
          },
          update: {
            description: `Allows ${action} access for ${newName}`,
            groupId: id,
          },
          create: {
            name: permissionName,
            description: `Allows ${action} access for ${newName}`,
            groupId: id,
          },
        });
      }
    } else if (newName !== existingGroup.name) {
      for (const permission of existingGroup.permissions) {
        const action = permission.name.split(":")[1];
        const newPermissionName = createPermissionName(newName, action);

        await transaction.permission.update({
          where: {
            id: permission.id,
          },
          data: {
            name: newPermissionName,
            description: `Allows ${action} access for ${newName}`,
          },
        });
      }
    }

    return transaction.permissionGroup.findUnique({
      where: {
        id,
      },
      include: {
        permissions: {
          orderBy: {
            name: "asc",
          },
        },
      },
    });
  });
}

export async function deletePermissionGroup(id) {
  const group = await prisma.permissionGroup.findUnique({
    where: {
      id,
    },
  });

  if (!group) {
    const error = new Error("Permission group not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.permissionGroup.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}