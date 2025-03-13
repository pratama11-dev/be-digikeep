import { Request, Response } from 'express';
import { defaultErrorHandling } from '../../Utils/errorHandling';
import { z } from 'zod';
import { ZodSchema } from '../../zSchema';
import moment from 'moment';
import { DateUtil } from '../../Utils/dateUtils';
import * as path from 'path';
import multer from "multer";
import * as fs from "fs";
import axios from "axios";
import { Prisma } from '@prisma/client';

export const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: Function) => {
        const uploadPath = path.join(process.cwd(), "pdf", "upload");

        // Create directory if it does not exist
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: (req: Request, file: Express.Multer.File, cb: Function) => {
        const originalName = path.parse(file.originalname).name;
        const ext = path.extname(file.originalname);
        const uniqueSuffix = DateUtil?.CurDate() + '-' + Math.round(Math.random() * 1E9); // Unique suffix to avoid name collisions
        const sanitizedOriginalName = originalName.replace(/\s+/g, '_');
        const filename = `${sanitizedOriginalName}-${uniqueSuffix}${ext}`;

        cb(null, filename);
    }
});

export const upload = multer({ storage });

export const ListDocument = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            pagination: z.object({
                take: z.number().optional(),
                skip: z.number().optional(),
            }),
            mode: z.enum(["accept", "decline", "created"]),
            search: z.string().optional(),
            filters: z.any().optional()
        }).parse(req.body);

        const where: Prisma.documentWhereInput = {
            AND: [
                i?.search !== "" ? {
                    title: {
                        contains: i.search
                    }
                } : undefined,
                i?.mode === "created" ? {
                    id_status: 1
                } : i?.mode === "accept" ? {
                    id_status: 2
                } : {
                    id_status: 3
                },
                i?.filters?.id_status?.length > 0 ? {
                    id_status: {
                        in: i?.filters?.id_status
                    }
                }: undefined
            ]
        }

        const data = await req.prisma.document.findMany({
            take: i?.pagination?.take,
            skip: i?.pagination?.skip,
            where,
            include: {
                business_partner: true,
                document_attachment: true,
                document_category: true,
                document_status: true
            },
            orderBy: {
                updated_at: "desc"
            }
        })

        const count = await req.prisma.document.count({
            where
        })

        return res.status(200).json({
            data: data,
            total: count
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const DocumentByStatus = async (req: Request, res: Response) => {
    try {
        const created = await req.prisma.document.count({
            where: {
                id_status: 1,
            }
        })

        const decline = await req.prisma.document.count({
            where: {
                id_status: 2,
            }
        })

        const accept = await req.prisma.document.count({
            where: {
                id_status: 2,
            }
        })

        return res.status(200).json({
            data: {
                created,
                decline,
                accept,
            },
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const DetailDocument = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            id: z.number()
        }).parse(req.body)

        const data = await req.prisma.document.findFirstOrThrow({
            where: {
                id: i?.id
            },
            include: {
                document_attachment: true,
                document_category: true,
                document_status: true
            },
            orderBy: {
                updated_at: "desc"
            }
        })


        return res.status(200).json({
            data: data,
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const CreateDocument = async (req: Request, res: Response) => {
    upload.array('file_upload')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: `Multer error: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ error: `Unknown error: ${err.message}` });
        }

        try {
            const i = z.object({
                category: z.string().optional().nullable(),
                name: z.string(),
                nomer_pengajuan: z.string().optional().nullable(),
                bl_code: z.string().optional().nullable(),
                bs_code: z.string().optional().nullable(),
                id_bp: z.string().optional().nullable(),
                new_bp: z.string().optional().nullable()
            }).parse(req.body);

            let bp

            if (i?.new_bp) {
                // check again
                bp = await req.prisma.business_partner.findFirst({
                    where: {
                        name: i?.new_bp
                    }
                })

                if (!bp) {
                    bp = await req.prisma.business_partner.create({
                        data: {
                            name: i?.new_bp
                        }
                    })
                }
            }

            // find category
            let findCategory = await req.prisma.document_category.findFirst({
                where: {
                    category: {
                        contains: i?.category
                    }
                }
            })

            if (findCategory) {
                findCategory = await req.prisma.document_category.create({
                    data: {
                        category: i?.category
                    }
                })
            }

            const data = await req.prisma.document.create({
                data: {
                    id_status: 1,
                    created_by: req.user.name,
                    created_at: DateUtil?.CurDate(),
                    id_category: findCategory?.id,
                    title: i?.name,
                    nomer_pengajuan: i?.nomer_pengajuan,
                    bs_code: i?.bs_code,
                    bl_code: i?.bl_code,
                    id_bp: parseInt(i?.id_bp) ?? bp?.id
                }
            })

            const fileUploads = (req.files as Express.Multer.File[]).map(file => {
                const baseUploadDir = path.join(process.cwd(), 'pdf', 'upload');
                const relativePath = path.relative(baseUploadDir, file.path);

                // Extract filename from the file path
                const filename = path.parse(file.originalname).name

                return {
                    id_doc: data.id,
                    file_attachment: relativePath,
                    description: filename,
                    created_at: DateUtil?.CurDate(),
                    last_updated_by: req.user.id
                };
            });

            await req.prisma.document_attachment.createMany({
                data: fileUploads,
            });

            return res.status(200).json({
                data
            })
        } catch (error) {
            return defaultErrorHandling(res, error)
        }
    });
}

export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            id: z.number()
        }).parse(req.body)

        const attachment = await req.prisma.document_attachment.findMany({
            where: {
                id_doc: i.id,
            },
        });

        for await (const element of attachment) {
            const filePath = path.join(process.cwd(), 'pdf', 'upload', element.file_attachment);

            // Delete the file from the server
            await new Promise<void>((resolve, reject) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        reject(new Error('Error deleting file'));
                    } else {
                        resolve();
                    }
                });
            });
        }


        const data = await req.prisma.document.delete({
            where: {
                id: i?.id
            }
        })

        return res.status(200).json({
            data
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const updateDoc = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            id: z.number(),
            id_category: z.number().optional().nullable(),
            name: z.string(),
            nomer_pengajuan: z.string().optional().nullable(),
            bl_code: z.string().optional().nullable(),
            bs_code: z.string().optional().nullable(),
            id_bp: z.number().optional().nullable()
        }).parse(req.body);

        const data = await req.prisma.document.update({
            where: {
                id: i?.id
            },
            data: {
                created_by: req.user.name,
                updated_at: DateUtil?.CurDate(),
                id_category: i?.id_category,
                title: i?.name,
                nomer_pengajuan: i?.nomer_pengajuan,
                bs_code: i?.bs_code,
                bl_code: i?.bl_code,
                id_bp: i?.id_bp
            }
        })

        return res.status(200).json({
            data
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const ListCategoryDocument = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            pagination: z.object({
                take: z.number().optional(),
                skip: z.number().optional(),
            }),
            search: z.string().optional(),
        }).parse(req.body);

        const data = await req.prisma.document_category.findMany({
            take: i?.pagination?.take ?? 100,
            skip: i?.pagination?.skip ?? 0
        })
        
        const total = await req.prisma.document_category?.count({
            where: {

            }
        })

        return res.status(200).json({
            data,
            total
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}

export const AddCategory = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            category: z.string()
        }).parse(req.body)

        const data = await req.prisma.document_category.create({
            data: {
                category: i?.category,
                created_at: DateUtil?.CurDate(),
                created_by: req.user.name
            }
        })

        return res.status(200).json({
            // data
        })
    } catch (error) {
        return defaultErrorHandling(res, error)
    }
}