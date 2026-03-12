import { IUser } from '../models/User';
export declare const generateToken: (user: IUser) => string;
export declare const verifyToken: (token: string) => any;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateReferralCode: (username: string) => string;
//# sourceMappingURL=auth.d.ts.map