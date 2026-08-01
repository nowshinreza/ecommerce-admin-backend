import prisma from "../prisma.js";

async function ensureLogoExists(logoId) {
  if (logoId === null || logoId === undefined) {
    return;
  }

  const media = await prisma.media.findUnique({
    where: {
      id: logoId,
    },
  });

  if (!media) {
    const error = new Error("Selected logo does not exist");
    error.statusCode = 404;
    throw error;
  }

  if (media.type !== "image") {
    const error = new Error("Brand logo must be an image file");
    error.statusCode = 400;
    throw error;
  }
}

export async function createBrand(data) {
  const existingBrand = await prisma.brand.findFirst({
    where: {
      OR: [
        {
          name: data.name,
        },
        {
          slug: data.slug,
        },
      ],
    },
  });

  if (existingBrand) {
    const error = new Error("Brand name or slug already exists");
    error.statusCode = 409;
    throw error;
  }

  await ensureLogoExists(data.logoId);

  return prisma.brand.create({
    data: {
      name: data.name,
      slug: data.slug,
      logoId: data.logoId || null,
      status: data.status,
      description: data.description || null,
    },
    include: {
      logo: true,
    },
  });
}

export async function getBrands(query) {
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

    ...(query.status !== undefined
      ? {
          status: query.status,
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: {
        logo: true,
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    }),

    prisma.brand.count({
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

export async function getBrandById(id) {
  const brand = await prisma.brand.findUnique({
    where: {
      id,
    },
    include: {
      logo: true,
    },
  });

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  return brand;
}

export async function updateBrand(id, data) {
  const existingBrand = await prisma.brand.findUnique({
    where: {
      id,
    },
  });

  if (!existingBrand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name !== existingBrand.name) {
    const duplicateName = await prisma.brand.findUnique({
      where: {
        name: data.name,
      },
    });

    if (duplicateName) {
      const error = new Error("Brand name already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.slug && data.slug !== existingBrand.slug) {
    const duplicateSlug = await prisma.brand.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (duplicateSlug) {
      const error = new Error("Brand slug already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.logoId !== undefined) {
    await ensureLogoExists(data.logoId);
  }

  return prisma.brand.update({
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

      ...(data.logoId !== undefined && {
        logoId: data.logoId,
      }),

      ...(data.status !== undefined && {
        status: data.status,
      }),

      ...(data.description !== undefined && {
        description: data.description,
      }),
    },
    include: {
      logo: true,
    },
  });
}

export async function deleteBrand(id) {
  const brand = await prisma.brand.findUnique({
    where: {
      id,
    },
  });

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.brand.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}