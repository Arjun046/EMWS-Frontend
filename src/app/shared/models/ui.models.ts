export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  companyId?: number;
}

export interface AuthResponse {
  token: string;
  user?: AppUser;
  username?: string;
  id?: number;
  companyId?: number;
}

export interface DashboardStat {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
  color: string;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'avatar' | 'actions' | 'currency' | 'status';
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface StatCard {
  label: string;
  value: string;
  trend?: string;
  delta?: string;
  icon?: string;
  tone?: 'default' | 'good' | 'warn' | 'accent';
}

export interface SpotlightCard {
  title: string;
  body: string;
  tag?: string;
  image?: string;
}

export interface TimelineItem {
  title: string;
  detail: string;
  time: string;
  tone: 'default' | 'good' | 'warn' | 'accent';
}

export interface WorkspaceConfig {
  title: string;
  subtitle: string;
  accent: string;
  filters: FilterOption[];
  stats: StatCard[];
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  spotlight: SpotlightCard[];
  timeline: TimelineItem[];
}

export interface WidgetEvent {
  topic: string;
  receivedAt: string;
  payload: unknown;
}

export interface ChatMessage {
  id?: number;
  clientMsgId?: string;
  senderId: number;
  recipientId: number | null;
  groupId: number | null;
  companyId: number;
  messageType?: string; // TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, EMOJI, TYPING
  content: string;
  fileUrl?: string;
  timestamp?: string;
  isRead: boolean;
  replyToId?: number;
  replyToContent?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  reactions?: ChatReactionSummary[];
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
}

export interface StatusStory {
  id: number;
  userId: number;
  companyId: number;
  content?: string | null;
  mediaUrl?: string | null;
  backgroundStyle?: string | null;
  statusType: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  viewedByRequester: boolean;
  active: boolean;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  category?: string;
  when?: string;
  status: 'Read' | 'Unread';
  isRead?: boolean;
  fileUrl?: string;
  replyToId?: number;
  isForwarded?: boolean;
}

export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  section: 'Overview' | 'Workforce' | 'Execution' | 'Insights' | 'Administration';
  badge?: string | number;
}

export interface ConversationContact {
  id: number;
  name: string;
  role: string;
  status: string;
  avatar: string;
  imageUrl?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

export interface ConversationGroup {
  id: number;
  name: string;
  description: string;
  members: number;
  accent: string;
  imageUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
}
