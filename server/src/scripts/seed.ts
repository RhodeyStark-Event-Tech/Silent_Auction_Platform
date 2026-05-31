import { supabase, ITEMS_TABLE } from '../supabase.js';
import { seedItems } from '../data/seedItems.js';

/**
 * Idempotent-ish seed: clears existing items then inserts the PDF catalogue.
 * Run with `npm run seed`. Requires the schema (supabase/schema.sql) to exist.
 */
async function main(): Promise<void> {
  console.info(`Seeding ${seedItems.length} auction items…`);

  // Remove existing items (bids cascade) so re-seeding is clean.
  const { error: deleteError } = await supabase
    .from(ITEMS_TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    throw new Error(`Failed to clear items: ${deleteError.message}`);
  }

  const { data, error } = await supabase.from(ITEMS_TABLE).insert(seedItems).select('id');
  if (error) {
    throw new Error(`Failed to insert items: ${error.message}`);
  }

  console.info(`✔ Inserted ${data?.length ?? 0} items.`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
