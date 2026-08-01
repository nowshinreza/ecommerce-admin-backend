import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import prisma from "../prisma.js";
import cloudinary from "../config/cloudinary.js";

const CLOUDINARY_FOLDER = "ecommerce-admin";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
];

function getMediaType(mimeType) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        },
      );

    uploadStream.end(buffer);
  });
}

function createThumbnailUrl(uploadResult, mediaType) {
  if (mediaType !== "image") {
    return null;
  }

  return cloudinary.url(uploadResult.public_id, {
    resource_type: uploadResult.resource_type,
    secure: true,
    transformation: [
      {
        width: 300,
        height: 300,
        crop: "limit",
      },
      {
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
}

async function deleteCloudinaryAsset(media) {
  if (!media.storedPath) {
    return;
  }

  const resourceType =
    media.type === "video"
      ? "video"
      : media.type === "document"
        ? "raw"
        : "image";

  try {
    await cloudinary.uploader.destroy(
      media.storedPath,
      {
        resource_type: resourceType,
        invalidate: true,
      },
    );
  } catch (error) {
    console.error(
      `Could not delete Cloudinary asset ${media.storedPath}:`,
      error.message,
    );
  }
}

async function saveSingleFile(file, userId) {
  const detectedType =
    await fileTypeFromBuffer(file.buffer);

  if (
    !detectedType ||
    !allowedMimeTypes.includes(detectedType.mime)
  ) {
    const error = new Error(
      "Invalid or unsupported file content",
    );

    error.statusCode = 400;
    throw error;
  }

  const mediaType = getMediaType(
    detectedType.mime,
  );

  const uniquePublicId =
    `${crypto.randomUUID()}-${Date.now()}`;

  const uploadResult = await uploadBuffer(
    file.buffer,
    {
      folder: CLOUDINARY_FOLDER,
      public_id: uniquePublicId,
      resource_type: "auto",
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    },
  );

  const thumbnailUrl = createThumbnailUrl(
    uploadResult,
    mediaType,
  );

  try {
    return await prisma.media.create({
      data: {
        fileName:
          uploadResult.public_id
            .split("/")
            .pop() || uniquePublicId,

        originalName: file.originalname,

        /*
          storedPath now stores the Cloudinary public ID.
          It is used later when deleting the asset.
        */
        storedPath: uploadResult.public_id,

        publicUrl: uploadResult.secure_url,

        mimeType: detectedType.mime,
        type: mediaType,
        size: uploadResult.bytes || file.size,

        width:
          uploadResult.width || null,

        height:
          uploadResult.height || null,

        thumbnail: thumbnailUrl,
        uploadedById: userId,
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    await cloudinary.uploader.destroy(
      uploadResult.public_id,
      {
        resource_type:
          uploadResult.resource_type,
        invalidate: true,
      },
    );

    throw error;
  }
}

export async function uploadMediaFiles(
  files,
  userId,
) {
  if (!files || files.length === 0) {
    const error = new Error(
      "At least one file is required",
    );

    error.statusCode = 400;
    throw error;
  }

  const savedFiles = [];

  try {
    for (const file of files) {
      const savedFile = await saveSingleFile(
        file,
        userId,
      );

      savedFiles.push(savedFile);
    }

    return savedFiles;
  } catch (error) {
    for (const savedFile of savedFiles) {
      await deleteCloudinaryAsset(savedFile);

      try {
        await prisma.media.delete({
          where: {
            id: savedFile.id,
          },
        });
      } catch {
        // Ignore cleanup errors.
      }
    }

    throw error;
  }
}

export async function getMediaList(query) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where = {
    ...(query.search
      ? {
          OR: [
            {
              originalName: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              altText: {
                contains: query.search,
                mode: "insensitive",
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
    prisma.media.findMany({
      where,

      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: limit,
    }),

    prisma.media.count({
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

export async function getMediaById(id) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },

    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  return media;
}

export async function updateMedia(id, data) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.media.update({
    where: {
      id,
    },

    data: {
      ...(data.title !== undefined && {
        title: data.title,
      }),

      ...(data.altText !== undefined && {
        altText: data.altText,
      }),
    },

    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function deleteMedia(id) {
  const media = await prisma.media.findUnique({
    where: {
      id,
    },
  });

  if (!media) {
    const error = new Error("Media not found");
    error.statusCode = 404;
    throw error;
  }

  await deleteCloudinaryAsset(media);

  await prisma.media.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}