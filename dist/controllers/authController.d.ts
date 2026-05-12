import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const verifyOTPAndRegister: (req: Request, res: Response) => Promise<void>;
export declare const resendOTP: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const getCurrentUser: (req: Request, res: Response) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
export declare const connectWallet: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map