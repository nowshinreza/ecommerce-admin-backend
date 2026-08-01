import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissionGroups = {
  Dashboard: ["watch"],

  Permission: ["watch", "create", "read", "update", "delete"],

  Role: ["watch", "create", "read", "update", "delete"],

  User: ["watch", "create", "read", "update", "delete"],

  Media: ["watch", "read", "upload", "write", "delete"],

  Category: ["watch", "create", "read", "update", "delete"],

  Brand: ["watch", "create", "read", "update", "delete"],

  Attribute: ["watch", "create", "read", "update", "delete"],

  Product: ["watch", "create", "read", "update", "delete"],
};

const catalogPermissionNames = [
  "dashboard:watch",

  "media:watch",
  "media:read",
  "media:upload",
  "media:write",
  "media:delete",

  "category:watch",
  "category:create",
  "category:read",
  "category:update",
  "category:delete",

  "brand:watch",
  "brand:create",
  "brand:read",
  "brand:update",
  "brand:delete",

  "attribute:watch",
  "attribute:create",
  "attribute:read",
  "attribute:update",
  "attribute:delete",

  "product:watch",
  "product:create",
  "product:read",
  "product:update",
  "product:delete",
];

async function createPermissions() {
  for (const [groupName, actions] of Object.entries(permissionGroups)) {
    const group = await prisma.permissionGroup.upsert({
      where: {
        name: groupName,
      },
      update: {
        description: `${groupName} module permissions`,
      },
      create: {
        name: groupName,
        description: `${groupName} module permissions`,
      },
    });

    for (const action of actions) {
      const permissionName = `${groupName.toLowerCase()}:${action}`;

      await prisma.permission.upsert({
        where: {
          name: permissionName,
        },
        update: {
          description: `Allows ${action} access for ${groupName}`,
          groupId: group.id,
        },
        create: {
          name: permissionName,
          description: `Allows ${action} access for ${groupName}`,
          groupId: group.id,
        },
      });
    }
  }
}

async function createRoles() {
  const allPermissions = await prisma.permission.findMany();

  const superAdminRole = await prisma.role.upsert({
    where: {
      name: "Super Administrator",
    },
    update: {
      description: "Full access to every module",
      status: true,
    },
    create: {
      name: "Super Administrator",
      description: "Full access to every module",
      status: true,
    },
  });

  await prisma.rolePermission.deleteMany({
    where: {
      roleId: superAdminRole.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: superAdminRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const catalogRole = await prisma.role.upsert({
    where: {
      name: "Catalog Manager",
    },
    update: {
      description:
        "Catalog access without permission, role or user management access",
      status: true,
    },
    create: {
      name: "Catalog Manager",
      description:
        "Catalog access without permission, role or user management access",
      status: true,
    },
  });

  const catalogPermissions = await prisma.permission.findMany({
    where: {
      name: {
        in: catalogPermissionNames,
      },
    },
  });

  await prisma.rolePermission.deleteMany({
    where: {
      roleId: catalogRole.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: catalogPermissions.map((permission) => ({
      roleId: catalogRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  return {
    superAdminRole,
    catalogRole,
  };
}

async function createUsers(superAdminRole, catalogRole) {
  const superAdminPassword = await bcrypt.hash("Admin123!", 10);
  const catalogPassword = await bcrypt.hash("Catalog123!", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@example.com",
    },
    update: {
      name: "Super Administrator",
      password: superAdminPassword,
      active: true,
      roleId: superAdminRole.id,
    },
    create: {
      name: "Super Administrator",
      email: "admin@example.com",
      password: superAdminPassword,
      phone: "01700000000",
      gender: "Other",
      active: true,
      roleId: superAdminRole.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "catalog@example.com",
    },
    update: {
      name: "Catalog Manager",
      password: catalogPassword,
      active: true,
      roleId: catalogRole.id,
    },
    create: {
      name: "Catalog Manager",
      email: "catalog@example.com",
      password: catalogPassword,
      phone: "01800000000",
      gender: "Other",
      active: true,
      roleId: catalogRole.id,
    },
  });
}

async function main() {
  console.log("Starting database seed...");

  await createPermissions();

  const { superAdminRole, catalogRole } = await createRoles();

  await createUsers(superAdminRole, catalogRole);

  console.log("Database seed completed.");
  console.log("");
  console.log("Super Administrator:");
  console.log("Email: admin@example.com");
  console.log("Password: Admin123!");
  console.log("");
  console.log("Catalog Manager:");
  console.log("Email: catalog@example.com");
  console.log("Password: Catalog123!");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });