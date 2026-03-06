"use client";

import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Categories } from "./categories";

interface SearchClientWrapperProps {
  categories: any[];
}

export const SearchClientWrapper = ({ categories }: SearchClientWrapperProps) => {
  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <Suspense fallback={<div>Loading...</div>}>
          <SearchInput />
        </Suspense>
      </div>
      <div className="p-6 space-y-4">
        <Suspense fallback={<div>Loading categories...</div>}>
          <Categories items={categories} />
        </Suspense>
      </div>
    </>
  );
};
