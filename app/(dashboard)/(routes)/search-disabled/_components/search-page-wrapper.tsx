"use client";

import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Categories } from "./categories";
import { CoursesList } from "@/components/courses-list";

interface SearchPageWrapperProps {
  categories: any[];
  courses: any[];
}

function SearchInputWithSuspense() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchInput />
    </Suspense>
  );
}

function CategoriesWithSuspense({ categories }: { categories: any[] }) {
  return (
    <Suspense fallback={<div>Loading categories...</div>}>
      <Categories items={categories} />
    </Suspense>
  );
}

export const SearchPageWrapper = ({ categories, courses }: SearchPageWrapperProps) => {
  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchInputWithSuspense />
      </div>
      <div className="p-6 space-y-4">
        <CategoriesWithSuspense categories={categories} />
        <CoursesList items={courses} />
      </div>
    </>
  );
};
