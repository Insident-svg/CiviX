import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

export type NotificationType =
  | 'grievance'
  | 'status'
  | 'assignment'
  | 'resolution'
  | 'verification'
  | 'dispute'
  | 'system';

export async function notify(
  userId: string,
  title: string,
  message: string,
  grievanceId?: string,
  type: NotificationType = 'grievance',
) {
  const recipient = await User.findById(userId).select('role').lean();
  return Notification.create({
    userId,
    ...(recipient?.role ? { recipientRole: recipient.role } : {}),
    type,
    title,
    message,
    ...(grievanceId ? { grievanceId } : {}),
  });
}

export async function notifyAdmins(
  title: string,
  message: string,
  grievanceId?: string,
  type: NotificationType = 'system',
) {
  const admins = await User.find({ role: 'admin', blocked: { $ne: true } }).select('_id').lean();
  if (!admins.length) return [];
  return Promise.all(admins.map(admin => notify(String(admin._id), title, message, grievanceId, type)));
}
