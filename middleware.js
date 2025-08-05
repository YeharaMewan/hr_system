// middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // `withAuth` middleware එකට callback එකක් යොදාගෙන role එක පරීක්ෂා කිරීම
  function middleware(req) {
    // req.nextauth.token එකේ අපේ role එක තියෙනවා
    if (
      req.nextUrl.pathname.startsWith("/dashboard") &&
      req.nextauth.token?.role !== "hr"
    ) {
      // role එක "HR" නොවේ නම්, login පිටුවට redirect කරන්න
      // 'rewrite' වෙනුවට 'redirect' භාවිතා කිරීම
      return NextResponse.redirect(new URL("/login?message=You Are Not Authorized!", req.url));
    }
  },
  {
    callbacks: {
      // පරිශීලකයෙක් ලොග් වී ඇත්දැයි පරීක්ෂා කිරීම
      authorized: ({ token }) => !!token,
    },
  }
);

// middleware එක ක්‍රියාත්මක විය යුතු මාර්ග (paths) මෙහි යොදන්න
export const config = {
  matcher: ["/dashboard/:path*"],
};
