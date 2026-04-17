import { useMemo, useState } from 'react';
import { ChevronLeft, Check, ChevronsUpDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';
import { CoffeeCupIcon, COFFEE_CUP_FILL_1 } from '@/components/CoffeeCupMark';
import { useDiscoveryOrgs } from '@/hooks/useDiscoveryOrgs';
import { useOrgMenuItems } from '@/hooks/useOrgMenuItems';
import { cn } from '@/lib/utils';
import type { CoffeeDetails, CoffeeLocationKind } from '@/hooks/useCoffees';

const PLACE_HOME_LABEL = 'Home';
const ORG_MENU_OTHER = '__org_menu_other__';

interface CoffeeDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: CoffeeDetails) => void;
  isPending?: boolean;
}

type LocationKind = 'home' | 'org' | 'other';

const inputOnOrange =
  'h-12 rounded-full border-0 bg-white text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-white/80';

const textareaOnOrange =
  'min-h-[120px] rounded-[1.25rem] border-0 bg-white text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-white/80';

function segmentBtn(active: boolean) {
  return cn(
    'h-11 flex-1 rounded-full px-2 text-xs font-semibold transition-colors sm:text-sm',
    active
      ? 'bg-white text-primary shadow-sm'
      : 'border-2 border-white/40 bg-transparent text-primary-foreground hover:bg-white/10',
  );
}

export function CoffeeDetailsSheet({ open, onOpenChange, onSave, isPending }: CoffeeDetailsSheetProps) {
  const [locationKind, setLocationKind] = useState<LocationKind>('home');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [placeOtherFree, setPlaceOtherFree] = useState('');
  const [orgComboOpen, setOrgComboOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');

  const [coffeeType, setCoffeeType] = useState<string | null>(null);
  const [coffeeTypeOther, setCoffeeTypeOther] = useState('');
  const [orgMenuKey, setOrgMenuKey] = useState<string | null>(null);
  const [orgMenuOtherText, setOrgMenuOtherText] = useState('');
  const [orgMenuComboOpen, setOrgMenuComboOpen] = useState(false);
  const [orgMenuSearch, setOrgMenuSearch] = useState('');

  const [tastingNotes, setTastingNotes] = useState<string>('');

  const { data: discoveryOrgs = [], isLoading: discoveryLoading } = useDiscoveryOrgs({ enabled: open });
  const { data: menuItemsRaw = [], isLoading: menuLoading } = useOrgMenuItems(
    locationKind === 'org' ? selectedOrgId ?? undefined : undefined,
  );

  const activeMenuItems = useMemo(
    () => menuItemsRaw.filter((m) => m.status === 'active'),
    [menuItemsRaw],
  );

  const selectedOrg = useMemo(
    () => discoveryOrgs.find((o) => o.id === selectedOrgId) ?? null,
    [discoveryOrgs, selectedOrgId],
  );

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return discoveryOrgs;
    return discoveryOrgs.filter(
      (o) =>
        o.org_name.toLowerCase().includes(q) ||
        (o.location && o.location.toLowerCase().includes(q)) ||
        (o.district && o.district.toLowerCase().includes(q)),
    );
  }, [discoveryOrgs, orgSearch]);

  const filteredOrgMenu = useMemo(() => {
    const q = orgMenuSearch.trim().toLowerCase();
    const items = activeMenuItems;
    if (!q) return items;
    return items.filter((m) => m.item_name.toLowerCase().includes(q));
  }, [activeMenuItems, orgMenuSearch]);

  const resetCoffeeFields = () => {
    setCoffeeType(null);
    setCoffeeTypeOther('');
    setOrgMenuKey(null);
    setOrgMenuOtherText('');
    setOrgMenuSearch('');
  };

  const setLocationKindAndReset = (kind: LocationKind) => {
    setLocationKind(kind);
    setSelectedOrgId(null);
    setPlaceOtherFree('');
    setOrgSearch('');
    resetCoffeeFields();
  };

  const buildPlace = (): string => {
    if (locationKind === 'home') return PLACE_HOME_LABEL;
    if (locationKind === 'other') return placeOtherFree.trim();
    if (locationKind === 'org' && selectedOrg) return selectedOrg.org_name.trim();
    return '';
  };

  const buildLocationKindForSave = (): CoffeeLocationKind | null => {
    if (locationKind === 'home') return 'home';
    if (locationKind === 'org') return 'coffee_shop';
    if (locationKind === 'other') return 'other';
    return null;
  };

  const buildOrgIdForSave = (): string | null => {
    if (locationKind === 'org' && selectedOrgId) return selectedOrgId;
    return null;
  };

  const buildCoffee = (): Pick<CoffeeDetails, 'log_item' | 'log_item_other'> => {
    if (locationKind === 'org' && selectedOrgId) {
      if (activeMenuItems.length === 0) {
        return { log_item: coffeeType, log_item_other: coffeeTypeOther };
      }
      if (orgMenuKey === ORG_MENU_OTHER) {
        return { log_item: 'Other', log_item_other: orgMenuOtherText.trim() };
      }
      if (orgMenuKey) {
        const item = activeMenuItems.find((m) => m.id === orgMenuKey);
        if (item) return { log_item: item.item_name, log_item_other: '' };
      }
      return { log_item: coffeeType, log_item_other: coffeeTypeOther };
    }
    return { log_item: coffeeType, log_item_other: coffeeTypeOther };
  };

  const handleSave = () => {
    const { log_item, log_item_other } = buildCoffee();
    onSave({
      location_kind: buildLocationKindForSave(),
      org_id: buildOrgIdForSave(),
      place: buildPlace() || null,
      log_item,
      log_item_other: log_item_other || null,
      tasting_notes: tastingNotes.trim() || null,
    });
  };

  const handleSkip = () => {
    onSave({
      location_kind: null,
      org_id: null,
      place: null,
      log_item: null,
      log_item_other: null,
      tasting_notes: null,
    });
  };

  const resetForm = () => {
    setLocationKind('home');
    setSelectedOrgId(null);
    setPlaceOtherFree('');
    setOrgSearch('');
    setOrgComboOpen(false);
    resetCoffeeFields();
    setOrgMenuComboOpen(false);
    setTastingNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleCoffeeTypeChange = (value: string[]) => {
    const selected = value[0] ?? null;
    setCoffeeType(selected);
    if (selected !== 'Other') setCoffeeTypeOther('');
  };

  const labelOrange = 'text-sm font-bold text-primary-foreground';

  const orgMenuDisplay =
    orgMenuKey === ORG_MENU_OTHER
      ? 'Other'
      : orgMenuKey
        ? activeMenuItems.find((m) => m.id === orgMenuKey)?.item_name ?? 'Search menu...'
        : 'Pick from menu...';

  const showOrgMenuCoffee =
    locationKind === 'org' && !!selectedOrgId && !menuLoading && activeMenuItems.length > 0;

  const showGenericCoffee =
    locationKind === 'home' ||
    locationKind === 'other' ||
    (locationKind === 'org' && !!selectedOrgId && !menuLoading && activeMenuItems.length === 0);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[95dvh] flex-col overflow-hidden rounded-t-3xl border-0 bg-transparent p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex max-h-[95dvh] flex-col overflow-y-auto">
          <div className="relative bg-[hsl(40,43%,98%)] px-4 pb-4 pt-3">
            <button
              type="button"
              className="absolute left-3 top-3 rounded-full p-2 text-foreground hover:bg-black/5"
              onClick={() => handleOpenChange(false)}
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <p className="text-center text-lg font-semibold lowercase text-muted-foreground">
              log a coffee
            </p>
            <div className="mt-3 flex items-center gap-3 px-2">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-16 w-16 shrink-0" />
              <h2 className="min-w-0 flex-1 text-left text-xl font-bold lowercase leading-tight text-foreground">
                what coffee did you drink today?
              </h2>
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-t-3xl bg-primary px-4 pb-8 pt-6 -mt-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className={labelOrange}>Where did you drink it?</Label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className={segmentBtn(locationKind === 'home')}
                    onClick={() => setLocationKindAndReset('home')}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    className={segmentBtn(locationKind === 'org')}
                    onClick={() => setLocationKindAndReset('org')}
                  >
                    Coffee shop
                  </button>
                  <button
                    type="button"
                    className={segmentBtn(locationKind === 'other')}
                    onClick={() => setLocationKindAndReset('other')}
                  >
                    Somewhere else
                  </button>
                </div>

                {locationKind === 'org' && (
                  <div className="space-y-2 pt-2">
                    <Label className={labelOrange}>Which coffee shop?</Label>
                    <Popover open={orgComboOpen} onOpenChange={setOrgComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={orgComboOpen}
                          className={cn(
                            'w-full justify-between rounded-full border-0 font-normal shadow-none',
                            inputOnOrange,
                          )}
                          disabled={discoveryLoading}
                        >
                          {discoveryLoading
                            ? 'Loading venues...'
                            : selectedOrg
                              ? selectedOrg.org_name
                              : 'Search venues...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search venues..."
                            value={orgSearch}
                            onValueChange={setOrgSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No venue found.</CommandEmpty>
                            <CommandGroup>
                              {filteredOrgs.map((o) => (
                                <CommandItem
                                  key={o.id}
                                  value={o.id}
                                  onSelect={() => {
                                    setSelectedOrgId(o.id);
                                    resetCoffeeFields();
                                    setOrgComboOpen(false);
                                    setOrgSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedOrgId === o.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  <span className="flex flex-col gap-0.5">
                                    <span>{o.org_name}</span>
                                    {(o.location || o.district) && (
                                      <span className="text-xs text-muted-foreground">
                                        {[o.district, o.location].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {locationKind === 'other' && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="place-other" className={labelOrange}>
                      Where?
                    </Label>
                    <Input
                      id="place-other"
                      placeholder="e.g. office, park, friend’s place..."
                      value={placeOtherFree}
                      onChange={(e) => setPlaceOtherFree(e.target.value)}
                      className={inputOnOrange}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className={labelOrange}>What did you have?</Label>

                {locationKind === 'org' && !selectedOrgId && (
                  <p className="text-xs font-medium text-primary-foreground/90">Choose a venue first.</p>
                )}

                {locationKind === 'org' && selectedOrgId && menuLoading && (
                  <p className="text-xs font-medium text-primary-foreground/90">Loading menu...</p>
                )}

                {showOrgMenuCoffee && (
                  <div className="space-y-2">
                    <Popover open={orgMenuComboOpen} onOpenChange={setOrgMenuComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={orgMenuComboOpen}
                          className={cn(
                            'w-full justify-between rounded-full border-0 font-normal shadow-none',
                            inputOnOrange,
                          )}
                          disabled={menuLoading}
                        >
                          {menuLoading ? 'Loading menu...' : orgMenuDisplay}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search menu..."
                            value={orgMenuSearch}
                            onValueChange={setOrgMenuSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              {filteredOrgMenu.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={m.id}
                                  onSelect={() => {
                                    setOrgMenuKey(m.id);
                                    setOrgMenuOtherText('');
                                    setOrgMenuComboOpen(false);
                                    setOrgMenuSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      orgMenuKey === m.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {m.item_name}
                                </CommandItem>
                              ))}
                              <CommandItem
                                value={ORG_MENU_OTHER}
                                onSelect={() => {
                                  setOrgMenuKey(ORG_MENU_OTHER);
                                  setOrgMenuComboOpen(false);
                                  setOrgMenuSearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    orgMenuKey === ORG_MENU_OTHER ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Other
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {orgMenuKey === ORG_MENU_OTHER && (
                      <div className="space-y-2">
                        <Label htmlFor="org-menu-other" className={labelOrange}>
                          Specify (optional)
                        </Label>
                        <Input
                          id="org-menu-other"
                          placeholder="What did you have?"
                          value={orgMenuOtherText}
                          onChange={(e) => setOrgMenuOtherText(e.target.value)}
                          className={inputOnOrange}
                        />
                      </div>
                    )}
                  </div>
                )}

                {locationKind === 'org' && selectedOrgId && !menuLoading && activeMenuItems.length === 0 && (
                  <p className="text-xs font-medium text-primary-foreground/90">
                    No menu listed for this venue yet — pick a drink type below.
                  </p>
                )}

                {showGenericCoffee && (
                  <>
                    <CoffeeTypeSelect
                      value={coffeeType ? [coffeeType] : []}
                      onChange={handleCoffeeTypeChange}
                      maxSelected={1}
                      label=""
                      labelClassName={labelOrange}
                      triggerClassName={inputOnOrange}
                      emptyLabel="Search coffee..."
                      searchPlaceholder="Search coffee..."
                    />
                    {coffeeType === 'Other' && (
                      <div className="space-y-2">
                        <Label htmlFor="coffee-type-other" className={labelOrange}>
                          Specify (optional)
                        </Label>
                        <Input
                          id="coffee-type-other"
                          placeholder="e.g. Custom blend name"
                          value={coffeeTypeOther}
                          onChange={(e) => setCoffeeTypeOther(e.target.value)}
                          className={inputOnOrange}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tasting-notes" className={labelOrange}>
                  Tasting notes
                </Label>
                <Textarea
                  id="tasting-notes"
                  placeholder="Notes about taste, vibe, who you were with..."
                  value={tastingNotes}
                  onChange={(e) => setTastingNotes(e.target.value)}
                  className={textareaOnOrange}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 border-2 border-primary-foreground bg-transparent font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 bg-primary-foreground font-semibold text-primary hover:bg-primary-foreground/90"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
