import { supabase } from './src/config/supabase.js';

async function syncCategories() {
  console.log('Fetching attendees with categories...');
  const { data: attendees, error: attErr } = await supabase
    .from('attendees')
    .select('invitation_id, category_id, first_name, last_name, full_name, email')
    .eq('event_id', '983d9797-3a7d-4746-8d82-38cb97a9968c')
    .not('category_id', 'is', null);

  if (attErr) {
    console.error(attErr);
    return;
  }

  console.log('Fetching invitations without category...');
  const { data: invitations, error: invErr } = await supabase
    .from('invitations')
    .select('id, guest_name')
    .eq('event_id', '983d9797-3a7d-4746-8d82-38cb97a9968c')
    .is('category_id', null);

  if (invErr) {
    console.error(invErr);
    return;
  }

  let updated = 0;
  const normalizeStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ');

  for (const inv of invitations) {
    let att = attendees.find(a => a.invitation_id === inv.id);
    
    if (!att) {
      const invNormName = normalizeStr(inv.guest_name);
      att = attendees.find(a => {
        const attNormName = normalizeStr(`${a.first_name || ''} ${a.last_name || ''}`);
        return attNormName === invNormName;
      });
    }

    if (att) {
      console.log(`Syncing category ${att.category_id} to invitation ${inv.id} (${inv.guest_name})`);
      const { error: updErr } = await supabase
        .from('invitations')
        .update({ category_id: att.category_id })
        .eq('id', inv.id);
      
      if (updErr) {
        console.error(`Failed to update ${inv.id}:`, updErr);
      } else {
        updated++;
      }
    }
  }
  console.log(`Total invitations updated: ${updated}`);
}

syncCategories();
