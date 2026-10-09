import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { User } from '../models/User.js';
import { Grievance } from '../models/Grievance.js';

const execFileAsync = promisify(execFile);

function enabled() {
  return process.env.CIVIX_OPENCLAW_WHATSAPP_ENABLED === 'true';
}

/**
 * Local-development bridge: the Windows backend invokes the OpenClaw CLI in
 * the default WSL distro. It deliberately does not use a shell, so message
 * content/phone numbers cannot become shell syntax.
 */
async function sendWhatsApp(target: string, message: string) {
  if (!enabled()) return;
  if (process.platform !== 'win32') {
    console.warn('[CiviX WhatsApp] Local OpenClaw bridge is enabled but backend is not running on Windows.');
    return;
  }
  try {
    await execFileAsync('wsl.exe', [
      '--', 'openclaw', 'message', 'send',
      '--channel', 'whatsapp',
      '--target', target,
      '--message', message,
    ], { timeout: 30_000, windowsHide: true, maxBuffer: 1024 * 1024 });
    console.info('[CiviX WhatsApp] Message sent via local OpenClaw.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    console.error('[CiviX WhatsApp] Delivery failed:', detail);
  }
}

async function getRecipient(grievance: any) {
  // Authorize delivery from the user's explicit WhatsApp opt-in. This also
  // supports existing grievances when the citizen opts in later from the
  // grievance detail page (which updates the User preference, not this record).
  if (!grievance?.userId) return null;
  const user = await User.findById(grievance.userId)
    .select('whatsappNotifications')
    .lean();
  const settings = user?.whatsappNotifications;
  if (!settings?.enabled || !settings?.phoneNumber || !/^\+[1-9]\d{7,14}$/.test(settings.phoneNumber)) return null;
  return settings.phoneNumber;
}

export async function sendGrievanceWhatsAppUpdate(
  grievanceId: unknown,
  kind: 'poc' | 'status',
  status?: string,
) {
  if (!enabled()) return;
  try {
    const grievance = await Grievance.findById(grievanceId).lean();
    if (!grievance) return;
    const target = await getRecipient(grievance);
    if (!target) return;

    const id = String(grievance.grievanceId || grievance._id);
    let message = '';
    if (kind === 'poc') {
      const poc = (grievance as any).poc;
      if (!poc?.name) return;
      message = [
        '🏛️ CiviX grievance update',
        `Grievance ID: ${id}`,
        'Your Person of Contact has been assigned:',
        `Name: ${poc.name}`,
        `Designation: ${poc.designation || 'Not provided'}`,
        `Department: ${poc.department || 'Not provided'}`,
        `Official contact: ${poc.officialContact || 'Not provided'}`,
        `Office hours: ${poc.officeHours || 'Not provided'}`,
      ].join('\n');
    } else {
      message = [
        '🏛️ CiviX grievance update',
        `Grievance ID: ${id}`,
        `New status: ${status || grievance.status}`,
        `Issue: ${String((grievance as any).title || (grievance as any).summary || 'Your submitted grievance').slice(0, 180)}`,
        (grievance as any).poc?.name ? `Person of Contact: ${(grievance as any).poc.name}` : '',
      ].filter(Boolean).join('\n');
    }
    await sendWhatsApp(target, message);
  } catch (error) {
    // Notifications must never make the underlying grievance operation fail.
    console.error('[CiviX WhatsApp] Could not prepare notification:', error instanceof Error ? error.message : error);
  }
}
