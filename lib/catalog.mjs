/** Original synthetic demonstration inventory. Prices are illustrative, not retailer offers. */
export const CATALOG = Object.freeze([
  { id: 'cook-pot', name: 'Everyday cooking pot', category: 'cooking', needGroup: 'cookware', priceCents: 1899, description: 'A lidded pot for simple stovetop meals.' },
  { id: 'cook-pan', name: 'Small frying pan', category: 'cooking', needGroup: 'cookware', priceCents: 1499, description: 'A compact pan for a small kitchen.' },
  { id: 'cook-utensils', name: 'Cooking spoon and turner', category: 'cooking', needGroup: 'utensils', priceCents: 699, description: 'Two basic cooking utensils.' },
  { id: 'cook-prep', name: 'Cutting board and prep knife', category: 'cooking', needGroup: 'prep', priceCents: 1299, description: 'A starter pair for food preparation.' },
  { id: 'cook-board', name: 'Compact cutting board', category: 'cooking', needGroup: 'prep', priceCents: 599, description: 'A prep surface; knife is not included.' },
  { id: 'cook-bowl', name: 'Bowl and cutlery set', category: 'cooking', needGroup: 'serveware', priceCents: 799, description: 'One place setting.' },
  { id: 'cook-cloth', name: 'Dishcloth pair', category: 'cooking', needGroup: 'cleanup', priceCents: 399, description: 'Reusable cloths for kitchen cleanup.' },
  { id: 'cook-box', name: 'Food storage container', category: 'cooking', needGroup: 'storage', priceCents: 499, description: 'One container for leftovers.' },
  { id: 'study-lamp', name: 'Adjustable desk lamp', category: 'study', needGroup: 'light', priceCents: 1799, description: 'Plug-in task light for a desk.' },
  { id: 'study-lamp-mini', name: 'Compact desk light', category: 'study', needGroup: 'light', priceCents: 1299, description: 'A small plug-in task light.' },
  { id: 'study-notebook', name: 'Notebook and pen pack', category: 'study', needGroup: 'notes', priceCents: 599, description: 'Paper and pens for study notes.' },
  { id: 'study-cards', name: 'Revision cards and pen', category: 'study', needGroup: 'notes', priceCents: 399, description: 'Cards for short notes and recall practice.' },
  { id: 'study-stand', name: 'Folding laptop stand', category: 'study', needGroup: 'stand', priceCents: 1599, description: 'A simple folding stand; laptop is not included.' },
  { id: 'study-organizer', name: 'Desk organizer tray', category: 'study', needGroup: 'organization', priceCents: 699, description: 'A tray for loose desk supplies.' },
  { id: 'study-timer', name: 'Simple focus timer', category: 'study', needGroup: 'timer', priceCents: 899, description: 'A timer for study sessions.' },
  { id: 'study-clips', name: 'Cable clip pack', category: 'study', needGroup: 'cables', priceCents: 349, description: 'Clips to organize desk cables.' },
  { id: 'repair-driver', name: 'Multi-bit screwdriver', category: 'repairs', needGroup: 'driver', priceCents: 999, description: 'A hand tool for common screws.' },
  { id: 'repair-driver-basic', name: 'Two-piece screwdriver set', category: 'repairs', needGroup: 'driver', priceCents: 699, description: 'Two basic hand screwdrivers.' },
  { id: 'repair-tape', name: 'Measuring tape', category: 'repairs', needGroup: 'measure', priceCents: 599, description: 'A compact tape for measurements.' },
  { id: 'repair-hammer', name: 'Small claw hammer', category: 'repairs', needGroup: 'hammer', priceCents: 1099, description: 'A basic household hammer.' },
  { id: 'repair-pliers', name: 'Combination pliers', category: 'repairs', needGroup: 'grip', priceCents: 899, description: 'A hand tool for gripping.' },
  { id: 'repair-level', name: 'Small bubble level', category: 'repairs', needGroup: 'level', priceCents: 599, description: 'A simple level for hanging shelves or frames.' },
  { id: 'repair-pouch', name: 'Tool storage pouch', category: 'repairs', needGroup: 'storage', priceCents: 499, description: 'A pouch for small hand tools.' },
  { id: 'repair-fasteners', name: 'Assorted picture fasteners', category: 'repairs', needGroup: 'fasteners', priceCents: 499, description: 'A sample assortment; match fasteners to your wall and load.' },
  { id: 'light-lantern', name: 'Battery lantern with batteries', category: 'lighting', needGroup: 'room', priceCents: 1999, description: 'A portable room light with a starter set of batteries.' },
  { id: 'light-lantern-small', name: 'Compact lantern with batteries', category: 'lighting', needGroup: 'room', priceCents: 1499, description: 'A small portable room light with batteries.' },
  { id: 'light-torch', name: 'Flashlight with batteries', category: 'lighting', needGroup: 'portable', priceCents: 999, description: 'A handheld light with batteries included.' },
  { id: 'light-headlamp', name: 'Headlamp with batteries', category: 'lighting', needGroup: 'portable', priceCents: 1299, description: 'A wearable light with batteries included.' },
  { id: 'light-bank', name: 'USB power bank', category: 'lighting', needGroup: 'charging', priceCents: 2199, description: 'A backup charger that must be charged before use.' },
  { id: 'light-cable', name: 'USB-C charging cable', category: 'lighting', needGroup: 'cable', priceCents: 599, description: 'Check connector compatibility with your device.' },
  { id: 'light-batteries', name: 'AA battery pack', category: 'lighting', needGroup: 'spares', priceCents: 699, description: 'Spare AA batteries for the demonstration lights.' },
  { id: 'light-pouch', name: 'Small storage pouch', category: 'lighting', needGroup: 'storage', priceCents: 399, description: 'Keep small lighting supplies together.' },
].map(product => Object.freeze(product)));

export const catalog = CATALOG;
export const CATALOG_NOTICE = 'Synthetic demonstration catalog. Prices are illustrative; no physical goods are sold or shipped.';
export function getProductById(id) { return CATALOG.find(product => product.id === id); }
