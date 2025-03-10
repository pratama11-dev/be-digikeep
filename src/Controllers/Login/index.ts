import { Request, Response } from "express";
import { defaultErrorHandling, rejectNull } from "../../Utils/errorHandling";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DateUtil } from "../../Utils/dateUtils";
import { hashids } from "../../Utils/hashIds";
import { ZodSchema } from "../../zSchema";
import { user } from "@prisma/client";

export const LoginUser = async (req: Request, res: Response) => {
    try {
        const { email, username, password, client_id } = req.body;
        rejectNull(email ?? username, "email or username", res);
        rejectNull(password, "password", res);
        rejectNull(client_id, "client_id", res);
        //   const platform = await req.prisma.sso_platforms.findUniqueOrThrow({
        //     where: {
        //       client_id,
        //     },
        //   });
        const user = await req.prisma.user.findFirst({
            where: {
                OR: [
                    {
                        email
                    }
                ]
            },
            include: {
                user_role: true
            }
        });
        if (!user) {
            throw new Error("Invalid username/email or password");
        }
        //   if (user?.id_status === 3) {
        //     throw new Error("Account need to be verify first!");
        //   }
        //   if (user?.id_status === 2) {
        //     throw new Error("Account is disabled!");
        //   }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new Error("Invalid username or password");
        }
        const payload = {
            id: user.id,
            email: user.email,
        };

        const token = jwt.sign(payload, process.env.APP_SECRET, {
            expiresIn: "24h",
        });
        const refreshToken = jwt.sign(
            payload,
            process.env.APP_SECRET + "refreshtokensss",
            { expiresIn: "7d" }
        );

        const now = new Date();
        let time = now.getTime();
        time += 3600 * 1000 * 24;
        now.setTime(time);

        // const data = `${"formula"}=${token};`;
        // const expires = `expires=${now.toUTCString()};`;
        // const path = "path=/;";
        // const httpOnly = "httpOnly;";
        // const SameSite = "SameSite=Strict;";
        // const cookies = data + expires + path + httpOnly + SameSite;
        // res.setHeader("Set-Cookie", cookies);

        return res.json({ message: "Logged in successfully", token, refreshToken });
    } catch (error) {
        return defaultErrorHandling(res, error);
    }
};

export const getUserById = async (req: Request, id: number) => {
    try {
        return await req.prisma.user.findFirst({ where: { id }, include: { user_role: true} });
    } catch (error) {
        throw new Error(error);
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    // #swagger.tags = ["Auth"]
    // #swagger.summary = 'refresh jwt token'
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is required" });
        }

        let decodedPayload: any;
        try {
            decodedPayload = jwt.verify(
                refreshToken,
                process.env.APP_SECRET + "refreshtokensss"
            );
        } catch (error) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const user: user | undefined = await getUserById(
            req,
            decodedPayload.id
        );
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const payload = {
            id: user.id,
            email: user.email,
        };
        const token = jwt.sign(payload, process.env.APP_SECRET, {
            expiresIn: "24h",
        });

        return res.json({ message: "Token refreshed successfully", token });
    } catch (error) {
        return defaultErrorHandling(res, error);
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const parsedInput = ZodSchema.ZInviteUser.parse(req.body);

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const data = await req.prisma.user.create({
            data: {
                name: parsedInput.name,
                email: parsedInput.email,
                password: hashedPassword,
                id_role: parsedInput?.id_role,
                created_at: DateUtil?.CurDate()
            },
        });

        return res.status(200).json({
            data,
        });
    } catch (error) {
        return defaultErrorHandling(res, error);
    }
};

export const logoutUser = async (req: Request, res: Response) => {
    try {
        // Invalidate the refresh token on the client-side
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        return defaultErrorHandling(res, error);
    }
};