import React from 'react';

interface DataTableProps {
  columns: string[];
  data: any[];
  actions?: (row: any) => React.ReactNode;
}

export default function DataTable({ columns, data, actions }: DataTableProps) {
  return (
    <table className="min-w-full border border-gray-200">
      <thead className="bg-gray-100">
        <tr>
          {columns.map(col => (
            <th key={col} className="px-4 py-2 text-left">{col}</th>
          ))}
          {actions && <th className="px-4 py-2">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-t">
            {columns.map(col => <td key={col} className="px-4 py-2">{row[col]}</td>)}
            {actions && <td className="px-4 py-2">{actions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
