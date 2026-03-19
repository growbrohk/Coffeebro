import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HuntFilterProps {
  hunts: { id: string; name: string }[];
  selectedCampaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  className?: string;
}

export function HuntFilter({
  hunts,
  selectedCampaignId,
  onCampaignChange,
  className,
}: HuntFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            'absolute top-2 right-2 z-[1000] h-8 w-8 rounded-md shadow-md',
            className
          )}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[9999] w-48 p-2" align="end">
        <Select
          value={selectedCampaignId ?? 'all'}
          onValueChange={(v) => onCampaignChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {hunts.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}
