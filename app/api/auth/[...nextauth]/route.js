// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User"; 
import Labour from "@/models/Labour"; 
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password } = credentials;

        try {
          await connectMongoDB();
          
          // First try to find user in User model
          let user = await User.findOne({ email });
          
          // If not found in User model, try Labour model
          if (!user) {
            user = await Labour.findOne({ email });
          }

          if (!user) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (!passwordsMatch) {
            return null;
          }
          
          // Return user with proper ID format for NextAuth
          return {
            id: user._id.toString(), // Convert MongoDB ObjectId to string
            email: user.email,
            name: user.name,
            role: user.role,
            _id: user._id.toString() // Keep both for compatibility
          };
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // JWT callback - store user info in token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // This will be the string version of MongoDB _id
        token.role = user.role;
        token._id = user._id || user.id; // Ensure we have _id for compatibility
      }
      return token;
    },
    // Session callback - pass user info to session
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id; // User ID as string
        session.user._id = token._id || token.id; // MongoDB ObjectId compatibility
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };