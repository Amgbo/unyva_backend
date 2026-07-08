# Hall Filter Implementation Checklist

This document lists all the steps required to implement a hall-filter in both product and service search pages.

## 🔧 Backend

1. **Extend filter types**
   - Add `halls?: number[]` (and optionally `hall_id?: number`) to the `SearchFilters` used by products and services.

2. **Controller parsing**
   - Parse `req.query.halls` (comma-separated string → number[]) in both `productController.ts` and `serviceController.ts`.
   - Pass it through when calling `searchProducts`/`searchServices`.

3. **Model logic**
   - In `productModel.searchProducts` and `serviceModel.searchServices` add a WHERE clause:
     ```ts
     if (halls && halls.length) {
       whereClauses.push(`… hall_id = ANY($${paramIndex})`);
       values.push(halls);
       paramIndex++;
     }
     ```
   - Ensure `LEFT JOIN university_halls h` is present so hall metadata can be returned.

4. **Filter-options query**
   - Include halls in the filter-options SQL (group by hall, count products/services).
   - Return the hall array in the `FilterOptions` response.

## 🛠 Frontend

1. **Type definitions**
   - `SearchFilters`, `ServiceSearchFilters`, `FilterOptions` must include `halls` like the backend types do.

2. **Service layer**
   - Append halls to the query string in `productService.searchProducts` and similar for services:
     ```ts
     if (filters.halls?.length) params.append('halls', filters.halls.join(','));
     ```

3. **Screen state & search logic**
   - Add `const [selectedHalls, setSelectedHalls] = useState<number[]>([]);`.
   - Include `halls: selectedHalls.length ? selectedHalls : undefined` when building filters for both product and service searches.
   - Reset/clear `selectedHalls` in `clearFilters()`.

4. **UI / filter modal**
   - Fetch halls via `getFilterOptions` and show them in the filter modal (picker/check-list).
   - Allow selecting multiple halls.
   - Display active hall chips in search results (handled in `search.tsx`).

5. **Behavior tracking** (optional)
   - When calling `behaviorService.trackSearch`, include the halls array.

## ✅ Verification

- Test searching products/services with no hall filter, single hall, multiple halls.
- Confirm filter counts in sidebar reflect hall totals.
- Ensure selecting/clearing halls updates the badge and results.

This list covers all the code touch-points needed for the hall-based filter to work end-to-end.