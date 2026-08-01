import prisma from "../prisma.js";

function getStockStatus(stock, lowStockThreshold = 5) {
  if (stock <= 0) {
    return "out-of-stock";
  }

  if (stock <= lowStockThreshold) {
    return "low-stock";
  }

  return "in-stock";
}

function normalizeCombination(attributeValueIds) {
  return [...new Set(attributeValueIds)]
    .sort((a, b) => a - b)
    .join("-");
}

async function validateBrand(brandId) {
  if (brandId === null || brandId === undefined) {
    return;
  }

  const brand = await prisma.brand.findUnique({
    where: {
      id: brandId,
    },
  });

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  if (!brand.status) {
    const error = new Error("Cannot assign an inactive brand");
    error.statusCode = 400;
    throw error;
  }
}

async function validateCategories(categoryIds) {
  const uniqueCategoryIds = [...new Set(categoryIds)];

  if (uniqueCategoryIds.length === 0) {
    return uniqueCategoryIds;
  }

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: uniqueCategoryIds,
      },
    },
  });

  if (categories.length !== uniqueCategoryIds.length) {
    const error = new Error("One or more categories do not exist");
    error.statusCode = 400;
    throw error;
  }

  return uniqueCategoryIds;
}

async function validateMedia(mediaItems) {
  const mediaIds = [
    ...new Set(mediaItems.map((item) => item.mediaId)),
  ];

  if (mediaIds.length === 0) {
    return;
  }

  const mediaFiles = await prisma.media.findMany({
    where: {
      id: {
        in: mediaIds,
      },
    },
  });

  if (mediaFiles.length !== mediaIds.length) {
    const error = new Error("One or more media files do not exist");
    error.statusCode = 400;
    throw error;
  }
}

async function validateVariants(variants) {
  const variantSkus = variants.map((variant) => variant.sku);
  const uniqueSkus = new Set(variantSkus);

  if (uniqueSkus.size !== variantSkus.length) {
    const error = new Error("Duplicate variant SKU in request");
    error.statusCode = 409;
    throw error;
  }

  const combinations = new Set();

  for (const variant of variants) {
    const uniqueValueIds = [
      ...new Set(variant.attributeValueIds),
    ];

    if (uniqueValueIds.length !== variant.attributeValueIds.length) {
      const error = new Error(
        `Variant ${variant.sku} contains duplicate attribute values`,
      );
      error.statusCode = 400;
      throw error;
    }

    const combination = normalizeCombination(uniqueValueIds);

    if (combinations.has(combination)) {
      const error = new Error(
        "Two variants cannot have the same attribute combination",
      );
      error.statusCode = 409;
      throw error;
    }

    combinations.add(combination);

    const values = await prisma.attributeValue.findMany({
      where: {
        id: {
          in: uniqueValueIds,
        },
      },
      include: {
        attribute: true,
      },
    });

    if (values.length !== uniqueValueIds.length) {
      const error = new Error(
        `Variant ${variant.sku} references an invalid attribute value`,
      );
      error.statusCode = 400;
      throw error;
    }

    const attributeIds = values.map(
      (value) => value.attributeId,
    );

    if (new Set(attributeIds).size !== attributeIds.length) {
      const error = new Error(
        `Variant ${variant.sku} cannot contain two values from the same attribute`,
      );
      error.statusCode = 400;
      throw error;
    }

    await validateMedia(variant.media);
  }
}

async function ensureUniqueProductFields(data, productId = null) {
  const duplicateProduct = await prisma.product.findFirst({
    where: {
      ...(productId
        ? {
            id: {
              not: productId,
            },
          }
        : {}),

      OR: [
        {
          slug: data.slug,
        },

        ...(data.sku
          ? [
              {
                sku: data.sku,
              },
            ]
          : []),
      ],
    },
  });

  if (duplicateProduct) {
    const error = new Error(
      "Product slug or SKU already exists",
    );
    error.statusCode = 409;
    throw error;
  }

  if (data.variants.length > 0) {
    const existingVariant = await prisma.variant.findFirst({
      where: {
        sku: {
          in: data.variants.map((variant) => variant.sku),
        },

        ...(productId
          ? {
              productId: {
                not: productId,
              },
            }
          : {}),
      },
    });

    if (existingVariant) {
      const error = new Error(
        `Variant SKU already exists: ${existingVariant.sku}`,
      );
      error.statusCode = 409;
      throw error;
    }
  }
}

async function createProductRelations(
  transaction,
  productId,
  data,
  categoryIds,
) {
  if (categoryIds.length > 0) {
    await transaction.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      })),
    });
  }

  if (data.media.length > 0) {
    await transaction.productMedia.createMany({
      data: data.media.map((item) => ({
        productId,
        mediaId: item.mediaId,
        isThumbnail: item.isThumbnail,
        isGallery: item.isGallery,
        sortOrder: item.sortOrder,
      })),
    });
  }

  for (const variantData of data.variants) {
    const variant = await transaction.variant.create({
      data: {
        productId,
        sku: variantData.sku,
        price: variantData.price,
        salePrice: variantData.salePrice ?? null,
        stock: variantData.stock,
        stockStatus: getStockStatus(
          variantData.stock,
          variantData.lowStockThreshold,
        ),
        lowStockThreshold: variantData.lowStockThreshold,
        weight: variantData.weight ?? null,
        active: variantData.active,
      },
    });

    await transaction.variantAttributeValue.createMany({
      data: variantData.attributeValueIds.map(
        (attributeValueId) => ({
          variantId: variant.id,
          attributeValueId,
        }),
      ),
    });

    if (variantData.media.length > 0) {
      await transaction.variantMedia.createMany({
        data: variantData.media.map((item) => ({
          variantId: variant.id,
          mediaId: item.mediaId,
          isThumbnail: item.isThumbnail,
          sortOrder: item.sortOrder,
        })),
      });
    }
  }
}

function productDetailsInclude() {
  return {
    brand: true,

    categories: {
      include: {
        category: true,
      },
    },

    media: {
      include: {
        media: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    },

    variants: {
      include: {
        attributeValues: {
          include: {
            attributeValue: {
              include: {
                attribute: true,
              },
            },
          },
        },

        media: {
          include: {
            media: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    },
  };
}

export async function createProduct(data) {
  await ensureUniqueProductFields(data);
  await validateBrand(data.brandId);

  const categoryIds = await validateCategories(
    data.categoryIds,
  );

  await validateMedia(data.media);
  await validateVariants(data.variants);

  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.hasVariants ? null : data.sku ?? null,
        shortDescription: data.shortDescription ?? null,
        longDescription: data.longDescription ?? null,
        hasVariants: data.hasVariants,
        price: data.hasVariants ? null : data.price,
        salePrice: data.hasVariants
          ? null
          : data.salePrice ?? null,
        stock: data.hasVariants ? null : data.stock,
        stockStatus: data.hasVariants
          ? null
          : getStockStatus(data.stock),
        weight: data.weight ?? null,
        active: data.active,
        featured: data.featured,
        sortOrder: data.sortOrder,
        brandId: data.brandId ?? null,
      },
    });

    await createProductRelations(
      transaction,
      product.id,
      data,
      categoryIds,
    );

    return transaction.product.findUnique({
      where: {
        id: product.id,
      },
      include: productDetailsInclude(),
    });
  });
}

export async function updateProduct(id, data) {
  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!existingProduct) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await ensureUniqueProductFields(data, id);
  await validateBrand(data.brandId);

  const categoryIds = await validateCategories(
    data.categoryIds,
  );

  await validateMedia(data.media);
  await validateVariants(data.variants);

  return prisma.$transaction(async (transaction) => {
    await transaction.productCategory.deleteMany({
      where: {
        productId: id,
      },
    });

    await transaction.productMedia.deleteMany({
      where: {
        productId: id,
      },
    });

    await transaction.variant.deleteMany({
      where: {
        productId: id,
      },
    });

    await transaction.product.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.hasVariants ? null : data.sku ?? null,
        shortDescription: data.shortDescription ?? null,
        longDescription: data.longDescription ?? null,
        hasVariants: data.hasVariants,
        price: data.hasVariants ? null : data.price,
        salePrice: data.hasVariants
          ? null
          : data.salePrice ?? null,
        stock: data.hasVariants ? null : data.stock,
        stockStatus: data.hasVariants
          ? null
          : getStockStatus(data.stock),
        weight: data.weight ?? null,
        active: data.active,
        featured: data.featured,
        sortOrder: data.sortOrder,
        brandId: data.brandId ?? null,
      },
    });

    await createProductRelations(
      transaction,
      id,
      data,
      categoryIds,
    );

    return transaction.product.findUnique({
      where: {
        id,
      },
      include: productDetailsInclude(),
    });
  });
}

export async function getProducts(query) {
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
              sku: {
                contains: query.search,
                mode: "insensitive",
              },
            },

            {
              variants: {
                some: {
                  sku: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),

    ...(query.brandId
      ? {
          brandId: query.brandId,
        }
      : {}),

    ...(query.categoryId
      ? {
          categories: {
            some: {
              categoryId: query.categoryId,
            },
          },
        }
      : {}),

    ...(query.active !== undefined
      ? {
          active: query.active,
        }
      : {}),
  };

  const orderBy = {
    [query.sortBy]: query.sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,

      include: {
        brand: true,

        categories: {
          include: {
            category: true,
          },
        },

        media: {
          where: {
            isThumbnail: true,
          },
          include: {
            media: true,
          },
          take: 1,
        },

        variants: {
          select: {
            price: true,
            salePrice: true,
            stock: true,
          },
        },
      },

      orderBy,
      skip,
      take: limit,
    }),

    prisma.product.count({
      where,
    }),
  ]);

  const formattedItems = items.map((product) => {
    let priceRange;
    let totalStock;

    if (product.hasVariants) {
      const prices = product.variants.map((variant) =>
        Number(variant.salePrice ?? variant.price),
      );

      const minimumPrice =
        prices.length > 0 ? Math.min(...prices) : null;

      const maximumPrice =
        prices.length > 0 ? Math.max(...prices) : null;

      priceRange =
        minimumPrice === maximumPrice
          ? minimumPrice
          : {
              minimum: minimumPrice,
              maximum: maximumPrice,
            };

      totalStock = product.variants.reduce(
        (total, variant) => total + variant.stock,
        0,
      );
    } else {
      priceRange = Number(
        product.salePrice ?? product.price,
      );

      totalStock = product.stock;
    }

    return {
      ...product,
      priceRange,
      totalStock,
    };
  });

  return {
    items: formattedItems,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    include: productDetailsInclude(),
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
}

export async function deleteProduct(id) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.product.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}