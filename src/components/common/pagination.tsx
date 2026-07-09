"use client";

import React from "react";
import {
  Pagination as PaginationNav,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

type Props = {
  currentPage: number;
  totalPages: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  handlePageChange: (pageNumber: number) => void;
};

function Pagination({
  currentPage,
  totalPages,
  handleNextPage,
  handlePreviousPage,
  handlePageChange,
}: Props) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => {
      return (
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 1
      );
    })
    .reduce((acc: (number | "...")[], page, i, arr) => {
      if (i > 0 && page - (arr[i - 1] as number) > 1) {
        acc.push("...");
      }
      acc.push(page);
      return acc;
    }, []);

  return (
    <PaginationNav className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            aria-label="Go to previous page"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }), "gap-1 pl-2.5")}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>
        </PaginationItem>

        {pages.map((page, index) => (
          <PaginationItem key={typeof page === "number" ? page : `ellipsis-${index}`}>
            {page === "..." ? (
              <PaginationEllipsis />
            ) : (
              <button
                type="button"
                onClick={() => handlePageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: page === currentPage ? "outline" : "ghost",
                    size: "icon",
                  }),
                )}
              >
                {page}
              </button>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            aria-label="Go to next page"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }), "gap-1 pr-2.5")}
          >
            <span>Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </PaginationItem>
      </PaginationContent>
    </PaginationNav>
  );
}

export default Pagination;
