import { Request, Response } from 'express';
import { defaultErrorHandling } from '../../Utils/errorHandling';
import { z } from 'zod';

export const listBp = async (req: Request, res: Response) => {
    try {
        const i = z.object({
            search: z.string().nullable().optional()
        }).parse(req.body)

        const data = await req.prisma.business_partner.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            i?.search ? {
                                name: {
                                    contains: i?.search
                                }
                            } : undefined
                        ]
                    }
                ]
            }
        })

        return res.status(200).json({
            data,
        })
    } catch (error) {
        return defaultErrorHandling(res, error);
    }
}