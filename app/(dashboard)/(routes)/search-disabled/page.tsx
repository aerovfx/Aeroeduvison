import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

import { db } from "@/lib/db";
import { getCourses } from "@/actions/get-courses";
import { CoursesList } from "@/components/courses-list";

const SearchPageClient = dynamic(() => import("./_components/search-page-client").then(mod => ({ default: mod.SearchPageClient })), {
  loading: () => <div>Loading...</div>
});

interface SearchPageProps {
  searchParams: Promise<{
    title: string;
    categoryId: string;
  }>
};

const SearchPage = async ({
  searchParams
}: SearchPageProps) => {
  const { title, categoryId } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return redirect("/");
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const courses = await getCourses({
    userId,
    title,
    categoryId,
  });

  return (
    <SearchPageClient categories={categories} courses={courses} />
   );
}
 
export default SearchPage;