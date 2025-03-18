// import jwt from 'jsonwebtoken';
// import { cookies } from 'next/headers';

// export const signToken = (userId: string) => {
//   return jwt.sign(
//     { userId },
//     process.env.JWT_SECRET as string,
//     { expiresIn: '7d' }  // 7 დღიანი ვადა
//   );
// };

// export const verifyToken = (token: string) => {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET as string);
//   } catch (error) {
//     return null;
//   }
// };

// export const getTokenFromCookies = () => {
//   const cookieStore = cookies();
//   return cookieStore.get('token')?.value;
// };

// export const setTokenCookie = (token: string) => {
//   cookies().set('token', token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax',
//     maxAge: 7 * 24 * 60 * 60, // 7 დღე
//   });
// };

// // ტოკენიდან userId-ის ამოღება
// export const getUserIdFromToken = (token: string) => {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
//     return decoded.userId;
//   } catch (error) {
//     console.log(error)
//     return null;
//   }
// };

// // ტოკენის ვადის შემოწმება
// export const isTokenExpired = (token: string) => {
//   try {
//     const decoded = jwt.decode(token) as { exp: number };
//     if (!decoded.exp) return true;
//     return Date.now() >= decoded.exp * 1000;
//   } catch {
//     return true;
//   }
// };
