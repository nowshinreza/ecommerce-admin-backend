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
    const error = new Error("Attribute value media must be an image");
    error.statusCode = 400;
    throw error;
  }
}

function checkDuplicateValues(values) {
  const valueSet = new Set();
  const slugSet = new Set();

  for (const item of values) {
    const normalizedValue = item.value.toLowerCase();
    const normalizedSlug = item.slug.toLowerCase();

    if (valueSet.has(normalizedValue)) {
      const error = new Error(
        `Duplicate attribute value: ${item.value}`,
      );
      error.statusCode = 409;
      throw error;
    }

    if (slugSet.has(normalizedSlug)) {
      const error = new Error(
        `Duplicate attribute value slug: ${item.slug}`,
      );
      error.statusCode = 409;
      throw error;
    }

    valueSet.add(normalizedValue);
    slugSet.add(normalizedSlug);
  }
}

export async function createAttribute(data) {
  const existingAttribute = await prisma.attribute.findFirst({
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

  if (existingAttribute) {
    const error = new Error("Attribute name or slug already exists");
    error.statusCode = 409;
    throw error;
  }

  checkDuplicateValues(data.values);

  for (const value of data.values) {
    await ensureMediaExists(value.mediaId);
  }

  return prisma.attribute.create({
    data: {
      name: data.name,
      slug: data.slug,
      type: data.type,
      values: {
        create: data.values.map((value) => ({
          value: value.value,
          slug: value.slug,
          referenceValue: value.referenceValue || null,
          mediaId: value.mediaId || null,
        })),
      },
    },
    include: {
      values: {
        include: {
          media: true,
        },
        orderBy: {
          value: "asc",
        },
      },
    },
  });
}

export async function getAttributes(query) {
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
              values: {
                some: {
                  value: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),

    ...(query.type
      ? {
          type: query.type,
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.attribute.findMany({
      where,
      include: {
        values: {
          include: {
            media: true,
          },
          orderBy: {
            value: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    }),

    prisma.attribute.count({
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

export async function getAttributeById(id) {
  const attribute = await prisma.attribute.findUnique({
    where: {
      id,
    },
    include: {
      values: {
        include: {
          media: true,
        },
        orderBy: {
          value: "asc",
        },
      },
    },
  });

  if (!attribute) {
    const error = new Error("Attribute not found");
    error.statusCode = 404;
    throw error;
  }

  return attribute;
}

export async function updateAttribute(id, data) {
  const existingAttribute = await prisma.attribute.findUnique({
    where: {
      id,
    },
  });

  if (!existingAttribute) {
    const error = new Error("Attribute not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name !== existingAttribute.name) {
    const duplicateName = await prisma.attribute.findUnique({
      where: {
        name: data.name,
      },
    });

    if (duplicateName) {
      const error = new Error("Attribute name already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.slug && data.slug !== existingAttribute.slug) {
    const duplicateSlug = await prisma.attribute.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (duplicateSlug) {
      const error = new Error("Attribute slug already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.attribute.update({
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

      ...(data.type !== undefined && {
        type: data.type,
      }),
    },
    include: {
      values: {
        include: {
          media: true,
        },
        orderBy: {
          value: "asc",
        },
      },
    },
  });
}

export async function addAttributeValue(attributeId, data) {
  const attribute = await prisma.attribute.findUnique({
    where: {
      id: attributeId,
    },
  });

  if (!attribute) {
    const error = new Error("Attribute not found");
    error.statusCode = 404;
    throw error;
  }

  await ensureMediaExists(data.mediaId);

  const duplicateValue = await prisma.attributeValue.findFirst({
    where: {
      attributeId,
      OR: [
        {
          value: {
            equals: data.value,
            mode: "insensitive",
          },
        },
        {
          slug: data.slug,
        },
      ],
    },
  });

  if (duplicateValue) {
    const error = new Error(
      "Attribute value or slug already exists in this attribute",
    );
    error.statusCode = 409;
    throw error;
  }

  return prisma.attributeValue.create({
    data: {
      value: data.value,
      slug: data.slug,
      referenceValue: data.referenceValue || null,
      mediaId: data.mediaId || null,
      attributeId,
    },
    include: {
      media: true,
      attribute: true,
    },
  });
}

export async function updateAttributeValue(
  attributeId,
  valueId,
  data,
) {
  const existingValue = await prisma.attributeValue.findFirst({
    where: {
      id: valueId,
      attributeId,
    },
  });

  if (!existingValue) {
    const error = new Error("Attribute value not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.mediaId !== undefined) {
    await ensureMediaExists(data.mediaId);
  }

  if (
    data.value !== undefined ||
    data.slug !== undefined
  ) {
    const duplicateValue = await prisma.attributeValue.findFirst({
      where: {
        attributeId,
        id: {
          not: valueId,
        },
        OR: [
          ...(data.value !== undefined
            ? [
                {
                  value: {
                    equals: data.value,
                    mode: "insensitive",
                  },
                },
              ]
            : []),

          ...(data.slug !== undefined
            ? [
                {
                  slug: data.slug,
                },
              ]
            : []),
        ],
      },
    });

    if (duplicateValue) {
      const error = new Error(
        "Attribute value or slug already exists in this attribute",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.attributeValue.update({
    where: {
      id: valueId,
    },
    data: {
      ...(data.value !== undefined && {
        value: data.value,
      }),

      ...(data.slug !== undefined && {
        slug: data.slug,
      }),

      ...(data.referenceValue !== undefined && {
        referenceValue: data.referenceValue,
      }),

      ...(data.mediaId !== undefined && {
        mediaId: data.mediaId,
      }),
    },
    include: {
      media: true,
      attribute: true,
    },
  });
}

export async function deleteAttributeValue(
  attributeId,
  valueId,
) {
  const existingValue = await prisma.attributeValue.findFirst({
    where: {
      id: valueId,
      attributeId,
    },
  });

  if (!existingValue) {
    const error = new Error("Attribute value not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.attributeValue.delete({
    where: {
      id: valueId,
    },
  });

  return {
    id: valueId,
  };
}

export async function deleteAttribute(id) {
  const attribute = await prisma.attribute.findUnique({
    where: {
      id,
    },
  });

  if (!attribute) {
    const error = new Error("Attribute not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.attribute.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}