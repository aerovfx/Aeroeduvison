"use client";

import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Categories } from "./categories";
import { CoursesList } from "@/components/courses-list";

interface SearchPageClientProps {
  categories: any[];
  courses: any[];
}

function SearchInputSuspense() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchInput />
    </Suspense>
  );
}

function CategoriesSuspense({ categories }: { categories: any[] }) {
  return (
    <Suspense fallback={<div>Loading categories...</div>}>
      <Categories items={categories} />
    </Suspense>
  );
}

export const SearchPageClient = ({ categories, courses }: SearchPageClientProps) => {
  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchInputSuspense />
      </div>
      <div className="p-6 space-y-4">
        <CategoriesSuspense categories={categories} />
        <CoursesList items={courses} />
      </div>
    </>
  );
};
