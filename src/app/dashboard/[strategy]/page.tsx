import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ strategy: string }>;
}

export default async function StrategyPage({ params }: Props) {
  const { strategy } = await params;
  redirect(`/dashboard?strategy=${encodeURIComponent(strategy)}`);
}
