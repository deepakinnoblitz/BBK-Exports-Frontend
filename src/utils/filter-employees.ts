/**
 * Utility function to filter employee options in Autocomplete dropdowns.
 * 
 * - Initially loads only the first 50 employees.
 * - When searching by employee name or ID, filters and returns matching results (up to 50).
 * - Matches all search terms across employee name and employee ID.
 */
export function filterEmployeeOptions<T = any>(
  opts: T[],
  state: { inputValue: string },
  lookupEmployees?: any[]
): T[] {
  const input = state.inputValue.toLowerCase().trim();

  const getSearchString = (opt: any): string => {
    if (typeof opt === 'string') {
      if (opt === 'all') return 'all employees';
      if (lookupEmployees && lookupEmployees.length > 0) {
        const emp = lookupEmployees.find((e: any) => e.name === opt || e.value === opt);
        if (emp) {
          const fullName = emp.employee_name || emp.label || '';
          const empId = emp.name || emp.value || emp.employee_id || '';
          return `${fullName} ${empId} (${empId})`.toLowerCase();
        }
      }
      return opt.toLowerCase();
    }

    if (!opt) return '';

    if (opt.name === 'all' || opt.value === 'all') {
      return 'all employees';
    }

    const fullName = opt.employee_name || opt.label || '';
    const empId = opt.name || opt.value || opt.employee_id || '';
    return `${fullName} ${empId} (${empId})`.toLowerCase();
  };

  if (!input) {
    return opts.slice(0, 50);
  }

  const terms = input.split(/\s+/).filter(Boolean);

  const filtered = opts.filter((opt) => {
    const searchStr = getSearchString(opt);
    return terms.every((term) => searchStr.includes(term));
  });

  return filtered.slice(0, 50);
}
