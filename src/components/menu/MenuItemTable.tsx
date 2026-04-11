import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";
import { Pencil } from "lucide-react";

type Props = {
  items: MenuItemRow[];
  onEdit: (row: MenuItemRow) => void;
};

export function MenuItemTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No menu items yet. Add your first drink or food item.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Temp</TableHead>
          <TableHead>Fulfill</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.item_name}</TableCell>
            <TableCell>{m.category}</TableCell>
            <TableCell className="text-right">{Number(m.base_price).toFixed(2)}</TableCell>
            <TableCell>{m.temperature_option}</TableCell>
            <TableCell>{m.fulfillment_option}</TableCell>
            <TableCell>{m.status}</TableCell>
            <TableCell>
              <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(m)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
