import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/index.js';
import { Button } from '../ui/button.jsx';

export default function Topbar() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60000,
  });

  const unread = data?.unreadCount ?? 0;

  return (
    <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6 gap-3">
      <Button variant="ghost" size="icon" className="relative">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
    </header>
  );
}
