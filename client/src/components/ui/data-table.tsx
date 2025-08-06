import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((data: T) => React.ReactNode);
  cell?: (data: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  keyField: keyof T;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  virtualized?: boolean;
  virtualizedHeight?: number;
  virtualizedItemHeight?: number;
  virtualizedOverscan?: number;
}

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(function MemoizedTableRow<T>({
  row,
  columns,
  keyField,
  onRowClick,
}: {
  row: T;
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
}) {
  return (
    <TableRow
      key={String(row[keyField])}
      onClick={() => onRowClick && onRowClick(row)}
      className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
    >
      {columns.map((column, index) => (
        <TableCell key={index}>
          {column.cell
            ? column.cell(row)
            : typeof column.accessor === "function"
            ? column.accessor(row)
            : String(row[column.accessor] ?? "")}
        </TableCell>
      ))}
    </TableRow>
  );
});

// Virtualized table body component - extreme memory optimization
const VirtualizedTableBody = memo(function VirtualizedTableBody<T>({
  data,
  columns,
  keyField,
  onRowClick,
  containerHeight,
  itemHeight = 48,
  overscan = 2, // Further reduced overscan for minimal memory footprint
}: {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  containerHeight: number;
  itemHeight?: number;
  overscan?: number;
}) {
  // Use refs instead of state to avoid re-renders
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const startIndexRef = useRef(0);
  const endIndexRef = useRef(0);
  const placeholderHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const visibleRowsRef = useRef<HTMLDivElement>(null);
  
  // Force update function without useState
  const [, forceUpdate] = useState({});
  const triggerRender = useCallback(() => forceUpdate({}), []);
  
  // Update scroll calculation without state changes
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    
    // Store scroll position in ref
    scrollTopRef.current = containerRef.current.scrollTop;
    
    // Calculate indices without creating temporary objects
    const totalItems = data.length;
    startIndexRef.current = Math.max(0, Math.floor(scrollTopRef.current / itemHeight) - overscan);
    
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    endIndexRef.current = Math.min(totalItems - 1, startIndexRef.current + visibleCount);
    
    // Update placeholder height
    placeholderHeightRef.current = startIndexRef.current * itemHeight;
    
    // Apply transform directly to DOM for better performance
    if (visibleRowsRef.current) {
      visibleRowsRef.current.style.transform = `translateY(${placeholderHeightRef.current}px)`;
    }
    
    // Force a single render after calculations
    triggerRender();
  }, [data.length, itemHeight, containerHeight, overscan]);
  
  // Optimized scroll handler with frame throttling
  const handleScroll = useCallback(() => {
    // Cancel any pending frame
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Schedule new calculation
    rafRef.current = requestAnimationFrame(() => {
      updateVisibleRange();
      rafRef.current = null;
    });
  }, [updateVisibleRange]);
  
  // Set up scroll listener with proper cleanup
  useEffect(() => {
    // Initial calculation
    updateVisibleRange();
    
    const container = containerRef.current;
    if (container) {
      // Use passive listener for better performance
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Complete cleanup
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }
  }, [handleScroll, updateVisibleRange]);
  
  // Recalculate on data or container size changes
  useEffect(() => {
    updateVisibleRange();
  }, [data.length, containerHeight, itemHeight, updateVisibleRange]);
  
  // Empty state handling
  if (data.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            No results found.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }
  
  // Get visible rows without creating new arrays when possible
  const visibleRows = data.slice(startIndexRef.current, endIndexRef.current + 1);
  
  // Calculate total content height
  const totalHeight = data.length * itemHeight;
  
  // For now, disable virtualization to fix DOM nesting errors
  // Return a standard TableBody instead of virtualized div structure
  return (
    <TableBody>
      {visibleRows.map((row) => (
        <TableRow
          key={String(row[keyField])}
          onClick={() => onRowClick && onRowClick(row)}
          className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
        >
          {columns.map((column, index) => (
            <TableCell key={index}>
              {column.cell
                ? column.cell(row)
                : typeof column.accessor === "function"
                ? column.accessor(row)
                : String(row[column.accessor] ?? "")}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
});

// Main DataTable component
const DataTable = <T extends object>({
  data,
  columns,
  onRowClick,
  keyField,
  itemsPerPageOptions = [10, 25, 50],
  defaultItemsPerPage = 10,
  searchable = false,
  searchPlaceholder = "Search...",
  virtualized = false,
  virtualizedHeight = 400,
  virtualizedItemHeight = 48,
  virtualizedOverscan = 5
}: DataTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Ensure data is an array and filter based on search query
  const safeData = Array.isArray(data) ? data : [];
  
  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = React.useMemo(() => {
    if (!(searchable && searchQuery)) return safeData;
    
    return safeData.filter((item) => {
      // Convert item to string representation and search for query
      return Object.values(item as object).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [safeData, searchable, searchQuery]);
  
  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = virtualized ? filteredData : filteredData.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);
  
  // Generate page numbers for pagination - memoized for performance
  const pageNumbers = React.useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with ellipsis
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </div>
      )}
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          {virtualized ? (
            <VirtualizedTableBody
              data={paginatedData}
              columns={columns}
              keyField={keyField}
              onRowClick={onRowClick}
              containerHeight={virtualizedHeight}
              itemHeight={virtualizedItemHeight}
              overscan={virtualizedOverscan}
            />
          ) : (
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <MemoizedTableRow
                    key={String(row[keyField])}
                    row={row}
                    columns={columns}
                    keyField={keyField}
                    onRowClick={onRowClick}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center text-sm text-muted-foreground">
          Showing <span className="font-medium mx-1">{paginatedData.length > 0 ? startIndex + 1 : 0}</span> 
          to <span className="font-medium mx-1">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> 
          of <span className="font-medium mx-1">{filteredData.length}</span> results
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={String(itemsPerPage)} />
            </SelectTrigger>
            <SelectContent>
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {!virtualized && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {pageNumbers.map((page, index) => (
                page === -1 ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <span className="px-4 py-2">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default DataTable;
