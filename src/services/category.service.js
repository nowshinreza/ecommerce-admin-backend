import prisma from "../prisma.js";

async function ensureMediaExists(mediaId) {
  if (mediaId === null || mediaId === undefined) {
    return;
  }

  const media = await prisma.media.findUnique({
    where: {
      id: mediaId,
    },
  });

  if (!media) {
    const error = new Error("Selected media does not exist");
    error.statusCode = 404;
    throw error;
  }

  if (media.type !== "image") {
    const error = new Error("Category image must be an image file");
    error.statusCode = 400;
    throw error;
  }
}

async function ensureParentExists(parentId) {
  if (parentId === null || parentId === undefined) {
    return;
  }

  const parent = await prisma.category.findUnique({
    where: {
      id: parentId,
    },
  });

  if (!parent) {
    const error = new Error("Parent category not found");
    error.statusCode = 404;
    throw error;
  }
}

async function wouldCreateCycle(categoryId, newParentId) {
  if (!newParentId) {
    return false;
  }

  if (categoryId === newParentId) {
    return true;
  }

  let currentParentId = newParentId;

  while (currentParentId) {
    const category = await prisma.category.findUnique({
      where: {
        id: currentParentId,
      },
      select: {
        parentId: true,
      },
    });

    if (!category) {
      return false;
    }

    if (category.parentId === categoryId) {
      return true;
    }

    currentParentId = category.parentId;
  }

  return false;
}

function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter((category) => category.parentId === parentId)
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category.id),
    }));
}

export async function createCategory(data) {
  const existingSlug = await prisma.category.findUnique({
    where: {
      slug: data.slug,
    },
  });

  if (existingSlug) {
    const error = new Error("Category slug already exists");
    error.statusCode = 409;
    throw error;
  }

  await ensureMediaExists(data.imageId);
  await ensureParentExists(data.parentId);

  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      imageId: data.imageId || null,
      parentId: data.parentId || null,
      active: data.active,
      sortOrder: data.sortOrder,
    },
    include: {
      image: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function getCategories(query) {
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
              slug: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),

    ...(query.active !== undefined
      ? {
          active: query.active,
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        image: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      skip,
      take: limit,
    }),

    prisma.category.count({
      where,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCategoryTree() {
  const categories = await prisma.category.findMany({
    include: {
      image: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return buildCategoryTree(categories);
}

export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
    include: {
      image: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
    },
  });

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
}

export async function updateCategory(id, data) {
  const existingCategory = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!existingCategory) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.slug && data.slug !== existingCategory.slug) {
    const duplicateSlug = await prisma.category.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (duplicateSlug) {
      const error = new Error("Category slug already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.imageId !== undefined) {
    await ensureMediaExists(data.imageId);
  }

  if (data.parentId !== undefined) {
    await ensureParentExists(data.parentId);

    const createsCycle = await wouldCreateCycle(id, data.parentId);

    if (createsCycle) {
      const error = new Error("Category parent would create a cycle");
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.category.update({
    where: {
      id,
    },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.slug !== undefined && {
        slug: data.slug,
      }),

      ...(data.description !== undefined && {
        description: data.description,
      }),

      ...(data.imageId !== undefined && {
        imageId: data.imageId,
      }),

      ...(data.parentId !== undefined && {
        parentId: data.parentId,
      }),

      ...(data.active !== undefined && {
        active: data.active,
      }),

      ...(data.sortOrder !== undefined && {
        sortOrder: data.sortOrder,
      }),
    },
    include: {
      image: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  if (category._count.children > 0) {
    const error = new Error(
      "Cannot delete a category that still has child categories",
    );
    error.statusCode = 409;
    throw error;
  }

  await prisma.category.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}