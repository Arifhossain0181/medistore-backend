
import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const profileData = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: profileData,
        });

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update profile', error });
    }
}
