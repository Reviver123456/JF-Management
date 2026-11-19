import { normalizeOwnerName, type ReportRow } from "@/lib/pm-data";
import { ALL_OWNERS_VALUE } from "@/lib/owner-filter";

export function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return year && month && day ? `${year}-${month}-${day}` : date;
}

export function rowMatchesFilters({
  endDate,
  ownerFilter,
  owners,
  query,
  result,
  resultFilter,
  rowDate,
  searchableText,
  startDate
}: {
  endDate: string;
  ownerFilter: string;
  owners: string[];
  query: string;
  result: ReportRow["result"];
  resultFilter?: string;
  rowDate: string;
  searchableText: string;
  startDate: string;
}) {
  const matchesQuery = query.trim() ? searchableText.toLowerCase().includes(query.trim().toLowerCase()) : true;
  const matchesOwner = ownerFilter === ALL_OWNERS_VALUE
    ? true
    : owners.some((owner) => normalizeOwnerName(owner) === normalizeOwnerName(ownerFilter));
  const matchesResult = resultFilter ? result === resultFilter : true;
  const matchesStart = startDate ? rowDate >= startDate : true;
  const matchesEnd = endDate ? rowDate <= endDate : true;

  return matchesQuery && matchesOwner && matchesResult && matchesStart && matchesEnd;
}