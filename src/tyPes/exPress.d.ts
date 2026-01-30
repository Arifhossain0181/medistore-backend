declare global{
    namespace Express {
        interface Request{
            user?: any;
            role?: string;
            email?: string;

        }
    }
}