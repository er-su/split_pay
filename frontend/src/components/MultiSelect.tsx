import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: number;
}

interface MultiSelectProps {
  options: Option[];
  selected: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select users",
}: MultiSelectProps) {
  const toggleValue = (value: number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options
    .filter(opt => selected.includes(opt.value))
    .map(opt => opt.label)
    .join(", ");

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "w-full px-3 py-2 border rounded-lg bg-white text-left",
          "hover:bg-gray-50 cursor-pointer"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : (
          <span className="text-gray-900">{selectedLabels}</span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-auto min-w-(--radix-popover-trigger-width) p-0 bg-white">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => toggleValue(opt.value)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox checked={selected.includes(opt.value)} />
                  <span>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
