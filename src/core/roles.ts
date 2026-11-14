// Decides which column is the name, price and MRP. Replace this later with owner settings.
export function inferRoles(columns: string[]) {
  const price = columns.length > 1 ? columns.length - 1 : -1;
  const mrpIndex = columns.findIndex((c) => c.trim().toLowerCase().startsWith("mrp"));
  const mrp = mrpIndex === price || mrpIndex === 0 ? -1 : mrpIndex;
  return { name: 0, price, mrp };
}