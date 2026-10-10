'use client';
import { useParams } from 'next/navigation';
import { WaiterBoard } from '@/components/WaiterBoard';

export default function PersonalWaiterPage() {
  const { token } = useParams<{ token: string }>();
  return <WaiterBoard token={token} />;
}
