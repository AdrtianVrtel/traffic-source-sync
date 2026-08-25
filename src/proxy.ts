import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/", "/traffic-sync", "/ac-cleaner", "/mention-tracker", "/admin/users", "/profile"],
};
