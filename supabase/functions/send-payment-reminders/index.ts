import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const REMINDER_FROM_EMAIL = Deno.env.get('REMINDER_FROM_EMAIL') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function istDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(date: string, amount: number) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function htmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: REMINDER_FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !REMINDER_FROM_EMAIL) {
    return Response.json(
      { error: 'Reminder function environment is incomplete.' },
      { status: 500 },
    );
  }

  try {
    const today = istDate();
    const date7 = addDays(today, 7);
    const date3 = addDays(today, 3);

    const [{ data: bills7, error: error7 }, { data: bills3, error: error3 }] = await Promise.all([
      supabase
        .from('bills')
        .select('id,user_id,bill_number,bill_date,due_date,amount,po_number,vendors(name)')
        .eq('status', 'pending')
        .eq('due_date', date7)
        .is('reminder_7_sent_at', null),
      supabase
        .from('bills')
        .select('id,user_id,bill_number,bill_date,due_date,amount,po_number,vendors(name)')
        .eq('status', 'pending')
        .eq('due_date', date3)
        .is('reminder_3_sent_at', null),
    ]);

    if (error7) throw error7;
    if (error3) throw error3;

    const results = {
      checked_on: today,
      seven_day: { found: bills7?.length ?? 0, sent: 0, failed: 0 },
      three_day: { found: bills3?.length ?? 0, sent: 0, failed: 0 },
    };

    const emailCache = new Map<string, string | null>();

    async function getOwnerEmail(userId: string) {
      if (emailCache.has(userId)) return emailCache.get(userId) ?? null;
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      const email = data.user?.email ?? null;
      emailCache.set(userId, email);
      return email;
    }

    async function processBill(bill: any, daysUntilDue: 7 | 3) {
      const ownerEmail = await getOwnerEmail(bill.user_id);
      if (!ownerEmail) throw new Error(`No account email found for user ${bill.user_id}`);

      const vendorName = Array.isArray(bill.vendors)
        ? (bill.vendors[0]?.name ?? 'Vendor')
        : (bill.vendors?.name ?? 'Vendor');

      const amount = money(Number(bill.amount ?? 0));
      const subject =
        daysUntilDue === 7
          ? `Payment reminder: ${bill.bill_number} due in 7 days`
          : `Payment reminder: ${bill.bill_number} due in 3 days`;

      const html = `
        <div style="background:#f6f8fc;padding:32px;font-family:Arial,sans-serif;color:#172033">
          <div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <div style="padding:24px;background:#eef2ff;border-bottom:1px solid #e0e7ff">
              <div style="font-size:21px;font-weight:800">Vendor<span style="color:#4f46e5">Pay</span></div>
              <div style="margin-top:5px;font-size:13px;color:#64748b">Payment reminder</div>
            </div>
            <div style="padding:28px">
              <h2 style="margin:0 0 10px;font-size:22px">Payment due in ${daysUntilDue} days</h2>
              <p style="margin:0 0 22px;color:#64748b">Please review this pending vendor payment.</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:10px 0;color:#64748b">Vendor</td><td style="padding:10px 0;text-align:right;font-weight:700">${htmlEscape(vendorName)}</td></tr>
                <tr><td style="padding:10px 0;color:#64748b">Bill number</td><td style="padding:10px 0;text-align:right;font-weight:700">${htmlEscape(bill.bill_number)}</td></tr>
                <tr><td style="padding:10px 0;color:#64748b">PO number</td><td style="padding:10px 0;text-align:right">${htmlEscape(bill.po_number ?? '—')}</td></tr>
                <tr><td style="padding:10px 0;color:#64748b">Amount</td><td style="padding:10px 0;text-align:right;font-size:18px;font-weight:800">${amount}</td></tr>
                <tr><td style="padding:10px 0;color:#64748b">Due date</td><td style="padding:10px 0;text-align:right;font-weight:700">${htmlEscape(bill.due_date)}</td></tr>
              </table>
              <div style="margin-top:22px;padding:14px;border-radius:12px;background:#eef2ff;color:#3730a3;font-size:13px">
                This reminder was generated automatically by VendorPay.
              </div>
            </div>
          </div>
        </div>
      `;

      await sendEmail(ownerEmail, subject, html);

      const field = daysUntilDue === 7 ? 'reminder_7_sent_at' : 'reminder_3_sent_at';
      const { error } = await supabase
        .from('bills')
        .update({ [field]: new Date().toISOString() })
        .eq('id', bill.id);

      if (error) throw error;
    }

    for (const bill of bills7 ?? []) {
      try {
        await processBill(bill, 7);
        results.seven_day.sent++;
      } catch (error) {
        console.error('7-day reminder failed:', bill.id, error);
        results.seven_day.failed++;
      }
    }

    for (const bill of bills3 ?? []) {
      try {
        await processBill(bill, 3);
        results.three_day.sent++;
      } catch (error) {
        console.error('3-day reminder failed:', bill.id, error);
        results.three_day.failed++;
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('Payment reminder job failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
});
