"use client";

import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Categories } from "./categories";

interface SearchSuspenseWrapperProps {
  categories: any[];
}

function SearchInputWrapper() {
  return <SearchInput />;
}

function CategoriesWrapper({ categories }: { categories: any[] }) {
  return <Categories items={categories} />;
}

export const SearchSuspenseWrapper = ({ categories }: SearchSuspenseWrapperProps) => {
  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchInputWrapper />
        </Suspense>
      </div>
      <div className="p-6 space-y-4">
        <Suspense fallback={<div>Loading categories...</div>}>
          <CategoriesWrapper categories={categories} />
        </Suspense>
      </div>
    </>
  );
};
