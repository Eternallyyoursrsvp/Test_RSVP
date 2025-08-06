# Wedding RSVP App Developer Documentation

## Utility Functions

Our application uses a set of consolidated utility functions for consistent behavior across components. These utilities help reduce code duplication and ensure consistent behaviors throughout the application.

### API Utilities (`client/src/lib/api-utils.ts`)

The API utilities provide a standardized way to interact with our backend APIs.

#### Basic HTTP Methods

```typescript
// GET request
const response = await get('/api/endpoint');

// POST request
const response = await post('/api/endpoint', { data });

// PUT request
const response = await put('/api/endpoint', { data });

// PATCH request 
const response = await patch('/api/endpoint', { data });

// DELETE request
const response = await del('/api/endpoint');
```

#### Advanced Usage

```typescript
// With query parameters
const response = await get('/api/endpoint', { param1: 'value', param2: 123 });

// With custom headers
const response = await post('/api/endpoint', data, { 
  headers: { 'Custom-Header': 'value' } 
});

// Handling 401 responses specially
const response = await get('/api/endpoint', null, { unauthorized: 'returnNull' });
```

#### Resource Operations

For standard CRUD operations:

```typescript
// Create a resource
const newResource = await apiOperations.create('/api/resources', resourceData);

// Fetch all resources
const resources = await apiOperations.fetchAll('/api/resources');

// Fetch a specific resource
const resource = await apiOperations.fetchById('/api/resources', id);

// Update a resource
const updatedResource = await apiOperations.update('/api/resources', id, updates);

// Delete a resource
await apiOperations.delete('/api/resources', id);
```

### Date Utilities (`client/src/lib/date-utils.ts`)

Date utilities provide consistent date formatting throughout the application. All components should use these utilities instead of implementing custom date formatting.

```typescript
// Standard date formats
const DATE_FORMATS = {
  FULL_DATE: 'MMMM do, yyyy',           // December 25th, 2025
  SHORT_DATE: 'MMM d, yyyy',            // Dec 25, 2025
  DAY_MONTH: 'MMMM d',                  // December 25
  YEAR_MONTH: 'MMMM yyyy',              // December 2025
  WEEKDAY_DATE: 'EEEE, MMMM do, yyyy',  // Friday, December 25th, 2025
  INPUT_DATE: 'yyyy-MM-dd',             // 2025-12-25 (HTML date input format)
  TIME_12H: 'h:mm a',                   // 3:30 PM
  TIME_24H: 'HH:mm',                    // 15:30
  DATE_TIME_12H: 'MMM d, yyyy h:mm a',  // Dec 25, 2025 3:30 PM
  DATE_TIME_24H: 'MMM d, yyyy HH:mm',   // Dec 25, 2025 15:30
};

// Format any date for display (preferred method)
formatDateForDisplay('2025-06-15'); // "June 15th, 2025"

// Format with time
formatDateForDisplay('2025-06-15T15:30:00', true); // "June 15th, 2025 3:30 PM" 

// Format specifically for date/time display
formatDateTimeForDisplay('2025-06-15T15:30:00'); // "June 15th, 2025 3:30 PM"

// Format for date input fields
formatForDateInput('2025-06-15'); // "2025-06-15"

// Low-level formatting with custom format string
formatDate('2025-06-15', DATE_FORMATS.SHORT_DATE); // "Jun 15, 2025"

// Get relative time
getRelativeTimeFromNow('2025-06-15'); // "in 2 months"

// Get remaining days
getDaysRemaining('2025-06-15'); // 60

// Get urgency class based on date
getDateUrgencyClass('2023-01-01'); // "text-muted-foreground" (past date)
getDateUrgencyClass('2025-06-01'); // "text-primary" (future date)
```

### Validation Utilities (`shared/validation-schemas.ts`)

The validation schemas provide centralized form validation rules.

```typescript
// Import shared schemas
import { userSchema, eventSchema } from '@shared/validation-schemas';

// Use in forms
const form = useForm({
  resolver: zodResolver(eventSchema),
  defaultValues: {...}
});
```

### Notification Utilities (`client/src/lib/notification-utils.ts`)

Utilities for consistent notifications and toasts:

```typescript
// Show success notification
showSuccess("Operation completed successfully");

// Show error notification
showError("An error occurred", "Details about the error");

// Show confirmation notification
showConfirmation("Are you sure?", () => handleConfirm(), () => handleCancel());
```

## Best Practices

1. **Always use consolidated utilities** rather than implementing duplicate functionality
2. **Update utilities when adding common functionality** that could be reused
3. **Follow the consistent naming conventions**:
   - `get/post/put/patch/del` for API calls
   - `formatDateForDisplay/formatForDateInput` for date formatting
   - `showSuccess/showError` for notifications
4. **Add proper TypeScript types** for all function parameters and return values
5. **Include JSDoc comments** for all utility functions to improve developer experience

## Components

### DataTable Component (`client/src/components/ui/data-table.tsx`)

A reusable table component with built-in pagination, sorting, and search functionality.

```typescript
<DataTable
  data={guests}
  columns={guestColumns}
  keyField="id"
  searchable={true}
  searchPlaceholder="Search guests..."
  onRowClick={handleRowClick}
  itemsPerPageOptions={[10, 25, 50]}
  defaultItemsPerPage={10}
/>
```

#### Column Definition

```typescript
const columns = [
  {
    header: "Name",
    accessor: "name", // can be a string for direct property access
  },
  {
    header: "Status",
    accessor: (row) => row.status, // can be a function for computed values
    cell: (row) => ( // optional custom cell renderer
      <Badge className={getStatusColor(row.status)}>
        {row.status.toUpperCase()}
      </Badge>
    ),
  }
]
```

### ActivityTable Component (`client/src/components/dashboard/activity-table.tsx`)

A specialized table component that uses DataTable internally with specific formatting for RSVP activity.

```typescript
<ActivityTable
  activities={recentActivities}
  onViewGuest={handleViewGuest}
  onEditGuest={handleEditGuest}
  onFilterChange={handleFilterChange}
/>
```

## Migration Guide

When migrating existing code to use the consolidated utilities:

### API Utilities Migration

1. Replace direct `fetch` calls with `get`, `post`, `put`, `patch`, or `del` from `api-utils.ts`
   - Before: `fetch('/api/endpoint').then(res => res.json())`
   - After: `get('/api/endpoint')`

2. Use resource operations for standard CRUD operations
   - Before: `fetch('/api/resources/' + id).then(res => res.json())`
   - After: `apiOperations.fetchById('/api/resources', id)`

### Date Formatting Migration

1. Replace all custom date formatters with standardized functions
   - Before: `new Date(date).toLocaleDateString()`
   - After: `formatDateForDisplay(date)`

2. Always use specialized functions for specific use cases
   - For form inputs: `formatForDateInput(date)`
   - For dates with times: `formatDateTimeForDisplay(date)`

### Table Component Migration

1. Replace custom table implementations with the DataTable component
   - Identify all column specifications
   - Convert to DataTable's column format with `header`, `accessor`, and optional `cell` properties
   - Set up appropriate pagination, sorting, and filtering options

2. For specialized tables, consider creating wrapper components like ActivityTable
   - Implement filter and selection logic in the wrapper component
   - Pass data through to DataTable for rendering

### Validation Logic Migration

1. Move schema definitions to central `validation-schemas.ts`
2. Use the schemas with Zod resolvers in React Hook Form
3. Share schemas between frontend and backend for consistent validation