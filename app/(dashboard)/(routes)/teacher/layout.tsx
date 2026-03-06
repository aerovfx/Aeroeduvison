import { isTeacher } from "@/lib/teacher";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const TeacherLayout = async ({
  children
}: {
  children: React.ReactNode;
}) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!isTeacher(session?.user?.role)) {
    return redirect("/");
  }

  return <>{children}</>
}
 
export default TeacherLayout;