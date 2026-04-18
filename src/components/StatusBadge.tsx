"use client";

const colorMap: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  "In Review": "bg-yellow-100 text-yellow-800",
  Published: "bg-green-100 text-green-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Planning: "bg-purple-100 text-purple-800",
  Active: "bg-green-100 text-green-800",
  Completed: "bg-blue-100 text-blue-800",
  Paused: "bg-orange-100 text-orange-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Rejected: "bg-red-100 text-red-800",
  Backlog: "bg-gray-100 text-gray-700",
  Testing: "bg-indigo-100 text-indigo-800",
  Validated: "bg-green-100 text-green-800",
  Invalidated: "bg-red-100 text-red-800",
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
  TOFU: "bg-blue-100 text-blue-800",
  MOFU: "bg-purple-100 text-purple-800",
  BOFU: "bg-orange-100 text-orange-800",
  Attention: "bg-blue-100 text-blue-800",
  Interest: "bg-cyan-100 text-cyan-800",
  Desire: "bg-purple-100 text-purple-800",
  Action: "bg-green-100 text-green-800",
};

export default function StatusBadge({ value }: { value: string }) {
  const cls = colorMap[value] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}
